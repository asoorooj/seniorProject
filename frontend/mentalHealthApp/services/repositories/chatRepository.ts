import { Message } from "@/components/chat/Message";
import { executeSqlAsync, initDb } from "@/services/db";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_LIMIT = 50;

type ServerMessage = Record<string, any>;

function normalizeServerMessage(message: ServerMessage) {
  const serverId = Number(message.id ?? message.server_id ?? 0);
  const userId = Number(message.userId ?? message.user_id ?? 0);
  const isUser =
    typeof message.isUser === "boolean"
      ? message.isUser
      : message.role === "user";
  const textMessage =
    message.textMessage ?? message.text_message ?? message.message ?? "";
  const timestamp =
    message.timestamp ?? message.created_at ?? new Date().toISOString();
  const emotionLabel = message.emotionLabel ?? message.emotion_label ?? null;

  return {
    serverId,
    userId,
    role: isUser ? "user" : "assistant",
    textMessage: String(textMessage),
    timestamp: new Date(timestamp).toISOString(),
    emotionLabel,
  };
}

async function resolveJwt(
  userId?: number,
  jwt?: string
): Promise<string | null> {
  await initDb();
  if (jwt) return jwt;
  return await AsyncStorage.getItem("token");
}

async function getNextLocalMessageId(): Promise<number> {
  await initDb();
  const result = await executeSqlAsync(`SELECT MIN(id) AS min_id FROM messages;`);
  const row = (result.rows as any).item(0);
  const minId = Number(row?.min_id ?? 0);
  return minId < 0 ? minId - 1 : -1;
}

function rowToMessage(row: any) {
  return new Message({
    id: row.id ?? undefined,
    userId: row.userId ?? undefined,
    isUser: row.role === "user",
    textMessage: row.textMessage ?? "",
    timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
    status:
      row.client_status === "sending" || row.client_status === "failed"
        ? row.client_status
        : "sent",
  });
}

export async function getRecentMessages(
  limit: number = DEFAULT_LIMIT,
  userId?: number
) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT *
    FROM messages
    WHERE user_id = ?
      AND deleted_at IS NULL
      AND synced = 1
    ORDER BY datetime(timestamp) ASC
    LIMIT ?;`,
    [userId ?? Number(await AsyncStorage.getItem("id")), limit]
  );

  const rows = result.rows as any;
  const items: Message[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rowToMessage(rows.item(i)));
  }
  return items;
}

export async function getAllMessages(userId?: number) {
  return getRecentMessages(DEFAULT_LIMIT, userId);
}

export async function getHistoryPage(params: {
  beforeServerId?: number;
  limit?: number;
  userId: number;
}) {
  const { beforeServerId, limit = 20, userId } = params;
  await initDb();

  if (!beforeServerId) {
    return getRecentMessages(limit, userId);
  }

  const result = await executeSqlAsync(
    `SELECT m.*
     FROM messages m
     WHERE user_id = ?
       AND m.deleted_at IS NULL
       AND m.synced = 1
       AND m.id > 0
       AND m.id < ?
     ORDER BY m.id DESC
     LIMIT ?;`,
    [userId, beforeServerId, limit]
  );

  const rows = result.rows as any;
  const items: Message[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rowToMessage(rows.item(i)));
  }
  return items.reverse();
}

export async function addLocalMessage(params: {
  textMessage: string;
  timestamp?: Date;
  status?: "sending" | "sent" | "failed";
  userId?: number;
}) {
  const {
    textMessage,
    timestamp = new Date(),
    status = "sending",
    userId,
  } = params;

  await initDb();

  const localId = await getNextLocalMessageId();
  const nowIso = new Date().toISOString();
  const ts = timestamp.toISOString();

  await executeSqlAsync(
    `INSERT INTO messages
      (id, user_id, role, textMessage, emotion_label, timestamp, client_status, synced, deleted_at, updated_at)
     VALUES (?, ?, 'user', ?, NULL, ?, ?, 0, NULL, ?);`,
    [localId, userId ?? Number(await AsyncStorage.getItem("id")), textMessage, ts, status, nowIso]
  );

  return new Message({
    id: localId,
    isUser: true,
    textMessage,
    timestamp,
    status,
  });
}

export async function upsertServerMessages(
  messages: ServerMessage[],
  userId?: number
) {
  await initDb();
  const nowIso = new Date().toISOString();

  const ensuredUser = new Set<number>();
  for (const message of messages) {
    const normalized = normalizeServerMessage(message);
    if (!normalized.serverId || !normalized.userId) continue;
    if (!ensuredUser.has(normalized.userId)) {
      ensuredUser.add(normalized.userId);
    }

    await executeSqlAsync(
      `INSERT INTO messages
        (id, user_id, role, textMessage, emotion_label, timestamp, client_status, synced, deleted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'sent', 1, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET
        user_id=excluded.user_id,
        role=excluded.role,
        textMessage=excluded.textMessage,
        emotion_label=excluded.emotion_label,
        timestamp=excluded.timestamp,
        client_status='sent',
        synced=1,
        deleted_at=NULL,
        updated_at=excluded.updated_at;`,
      [
        normalized.serverId,
        normalized.userId,
        normalized.role,
        normalized.textMessage,
        normalized.emotionLabel,
        normalized.timestamp,
        nowIso,
      ]
    );
  }

  await trimSyncedMessages(DEFAULT_LIMIT, userId ?? Number(await AsyncStorage.getItem("id")));
}

export async function markMessageSynced(params: {
  localId: number;
  serverMessage?: ServerMessage;
  userId?: number;
}) {
  const { localId, serverMessage, userId } = params;
  await initDb();

  if (serverMessage) {
    await upsertServerMessages([serverMessage], userId);
    const normalized = normalizeServerMessage(serverMessage);
    if (localId !== normalized.serverId) {
      await executeSqlAsync(`DELETE FROM messages WHERE id = ?;`, [localId]);
    }
    return;
  }

  await executeSqlAsync(
    `UPDATE messages
     SET client_status = 'sent', synced = 1, updated_at = ?
     WHERE id = ?;`,
    [new Date().toISOString(), localId]
  );
}

export async function updateMessageStatus(
  localId: number,
  status: "sending" | "sent" | "failed",
  userId: number
) {
  await initDb();
  await executeSqlAsync(
    `UPDATE messages
     SET client_status = ?, synced = CASE WHEN ? = 'sent' THEN 1 ELSE synced END, updated_at = ?
     WHERE id = ?
       AND user_id = ?;`,
    [status, status, new Date().toISOString(), localId, userId]
  );
}

export async function getOldestServerId(userId?: number) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT m.id AS message_id
     FROM messages m
     WHERE user_id = ?
       AND m.synced = 1
       AND m.id > 0
       AND m.deleted_at IS NULL
     ORDER BY m.id ASC
     LIMIT 1;`,
    [userId ?? Number(await AsyncStorage.getItem("id"))]
  );
  const row = (result.rows as any).item(0);
  return row?.message_id ?? null;
}

export async function getLatestUserEmotionLabel(
  userId?: number
) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT m.emotion_label
     FROM messages m
     WHERE user_id = ?
       AND m.role = 'user'
       AND m.emotion_label IS NOT NULL
       AND m.deleted_at IS NULL
     ORDER BY datetime(m.timestamp) DESC, m.id DESC
     LIMIT 1;`,
    [userId  ?? Number(await AsyncStorage.getItem("id"))]
  );
  const row = (result.rows as any).item(0);
  return row?.emotion_label ?? null;
}

export async function trimSyncedMessages(
  limit: number = DEFAULT_LIMIT,
  userId?: number
) {
  userId = userId ?? Number(await AsyncStorage.getItem("id"));
  await initDb();
  await executeSqlAsync(
    `DELETE FROM messages
    WHERE user_id = ?
      AND synced = 1
      AND deleted_at IS NULL
      AND id NOT IN (
        SELECT id
        FROM messages
        WHERE user_id = ?
          AND synced = 1
          AND deleted_at IS NULL
        ORDER BY datetime(timestamp) DESC, id DESC
        LIMIT ?
      );`,
    [userId, userId, limit]
  );
}
