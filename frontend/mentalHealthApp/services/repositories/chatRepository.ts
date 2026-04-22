import { Message } from "@/components/chat/Message";
import { executeSqlAsync, initDb } from "@/services/db";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_LIMIT = 50;

type ServerMessage = Record<string, any>;
export type HistoryCursor = {
  beforeTs: string;
  beforeId: number;
};

function toEpochMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? Math.trunc(value * 1000) : Math.trunc(value);
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000
        ? Math.trunc(numeric * 1000)
        : Math.trunc(numeric);
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function epochMsToIso(value: number): string {
  return new Date(value).toISOString();
}

function normalizeServerMessage(message: ServerMessage) {
  const serverId = Number(message.id ?? message.server_id ?? 0);
  const userId = Number(message.userId ?? message.user_id ?? 0);
  const isUser =
    typeof message.isUser === "boolean"
      ? message.isUser
      : message.role === "user";
  const textMessage =
    message.textMessage ?? message.text_message ?? message.message ?? "";
  const timestampMs = toEpochMs(
    message.timestamp ?? message.created_at ?? Date.now()
  );
  const emotionLabel = message.emotionLabel ?? message.emotion_label ?? null;

  return {
    serverId,
    userId,
    role: isUser ? "user" : "assistant",
    textMessage: String(textMessage),
    timestampMs,
    emotionLabel,
  };
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
    userId: row.user_id ?? row.userId ?? undefined,
    isUser: row.role === "user",
    textMessage: row.textMessage ?? "",
    timestamp: new Date(toEpochMs(row.timestamp)),
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
  const resolvedUserId = userId ?? Number(await AsyncStorage.getItem("id"));
  const result = await executeSqlAsync(
    `SELECT m.*
     FROM messages m
     WHERE m.user_id = ?
       AND m.deleted_at IS NULL
       AND (
         m.synced = 0
         OR m.id IN (
           SELECT id
           FROM messages
           WHERE user_id = ?
             AND synced = 1
             AND deleted_at IS NULL
           ORDER BY timestamp DESC, id DESC
           LIMIT ?
         )
       )
     ORDER BY m.timestamp ASC, m.id ASC;`,
    [resolvedUserId, resolvedUserId, limit]
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
  beforeTs?: string | number;
  beforeId?: number;
  limit?: number;
  userId: number;
}) {
  const { beforeTs, beforeId, limit = 20, userId } = params;
  await initDb();

  if (beforeTs == null) {
    return getRecentMessages(limit, userId);
  }
  const beforeTsMs = toEpochMs(beforeTs);

  let result;
  if (typeof beforeId === "number") {
    result = await executeSqlAsync(
      `SELECT m.*
       FROM messages m
       WHERE m.user_id = ?
         AND m.deleted_at IS NULL
         AND m.synced = 1
         AND m.id > 0
         AND (
           m.timestamp < ?
           OR (m.timestamp = ? AND m.id < ?)
         )
       ORDER BY m.timestamp DESC, m.id DESC
       LIMIT ?;`,
      [userId, beforeTsMs, beforeTsMs, beforeId, limit]
    );
  } else {
    result = await executeSqlAsync(
      `SELECT m.*
       FROM messages m
       WHERE m.user_id = ?
         AND m.deleted_at IS NULL
         AND m.synced = 1
         AND m.id > 0
         AND m.timestamp < ?
       ORDER BY m.timestamp DESC, m.id DESC
       LIMIT ?;`,
      [userId, beforeTsMs, limit]
    );
  }

  const rows = result.rows as any;
  const items: Message[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rowToMessage(rows.item(i)));
  }
  return items.reverse();
}

export function getEarliestCursorFromIncoming(
  messages: ServerMessage[]
): HistoryCursor | null {
  let earliest: HistoryCursor | null = null;

  for (const message of messages ?? []) {
    const normalized = normalizeServerMessage(message);
    if (!normalized.serverId) continue;

    if (!earliest) {
      earliest = {
        beforeTs: epochMsToIso(normalized.timestampMs),
        beforeId: normalized.serverId,
      };
      continue;
    }

    const normalizedTs = normalized.timestampMs;
    const earliestTs = new Date(earliest.beforeTs).getTime();
    if (!Number.isFinite(normalizedTs) || !Number.isFinite(earliestTs)) {
      continue;
    }
    const tsDiff = normalizedTs - earliestTs;
    if (tsDiff < 0 || (tsDiff === 0 && normalized.serverId < earliest.beforeId)) {
      earliest = {
        beforeTs: epochMsToIso(normalized.timestampMs),
        beforeId: normalized.serverId,
      };
    }
  }

  return earliest;
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
  const ts = timestamp.getTime();

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
        normalized.timestampMs,
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

export async function getOldestSyncedCursor(
  userId?: number
): Promise<HistoryCursor | null> {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT m.id AS message_id, m.timestamp AS timestamp
     FROM messages m
     WHERE user_id = ?
       AND m.synced = 1
       AND m.id > 0
       AND m.deleted_at IS NULL
     ORDER BY m.timestamp ASC, m.id ASC
     LIMIT 1;`,
    [userId ?? Number(await AsyncStorage.getItem("id"))]
  );
  const row = (result.rows as any).item(0);
  const messageId = Number(row?.message_id ?? 0);
  if (!row?.timestamp || !messageId) {
    return null;
  }
  return {
    beforeTs: epochMsToIso(toEpochMs(row.timestamp)),
    beforeId: messageId,
  };
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
     ORDER BY m.timestamp DESC, m.id DESC
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
        ORDER BY timestamp DESC, id DESC
        LIMIT ?
      );`,
    [userId, userId, limit]
  );
}
