import { Message } from "@/components/chat/Message";
import { executeSqlAsync, getCurrentUserId, initDb } from "@/services/db";

const DEFAULT_LIMIT = 50;

type ServerMessage = Record<string, any>;

function normalizeServerMessage(message: ServerMessage) {
  const serverId = Number(message.id ?? message.server_id ?? 0);
  const sessionId = Number(message.sessionId ?? message.session_id ?? 0);
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
    sessionId,
    role: isUser ? "user" : "assistant",
    textMessage: String(textMessage),
    timestamp: new Date(timestamp).toISOString(),
    emotionLabel,
  };
}

async function resolveSessionId(
  userId: number,
  explicitSessionId?: number
): Promise<number | null> {
  await initDb();
  if (explicitSessionId) return explicitSessionId;
  const result = await executeSqlAsync(
    `SELECT id FROM sessions
     WHERE user_id = ?
     ORDER BY datetime(COALESCE(last_seen_at, started_at)) DESC, id DESC
     LIMIT 1;`,
    [userId]
  );
  const row = (result.rows as any).item(0);
  return row?.id ?? null;
}

async function ensureSessionExists(sessionId: number, userId: number) {
  const nowIso = new Date().toISOString();
  await executeSqlAsync(
    `INSERT INTO sessions (id, user_id, started_at, last_seen_at, synced)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
      user_id=excluded.user_id,
      last_seen_at=excluded.last_seen_at,
      synced=1;`,
    [sessionId, userId, nowIso, nowIso]
  );
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
    sessionId: row.session_id ?? undefined,
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
  userId: number = getCurrentUserId()
) {
  await initDb();
  const result = await executeSqlAsync(
    `WITH user_messages AS (
       SELECT m.*
       FROM messages m
       JOIN sessions s ON s.id = m.session_id
       WHERE s.user_id = ? AND m.deleted_at IS NULL
     ),
     synced_rows AS (
       SELECT *
       FROM user_messages
       WHERE synced = 1
       ORDER BY datetime(timestamp) DESC, id DESC
       LIMIT ?
     ),
     unsynced_rows AS (
       SELECT *
       FROM user_messages
       WHERE synced = 0
     ),
     combined AS (
       SELECT * FROM synced_rows
       UNION ALL
       SELECT * FROM unsynced_rows
     )
     SELECT *
     FROM combined
     ORDER BY datetime(timestamp) ASC, id ASC;`,
    [userId, limit]
  );

  const rows = result.rows as any;
  const items: Message[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rowToMessage(rows.item(i)));
  }
  return items;
}

export async function getAllMessages(userId: number = getCurrentUserId()) {
  return getRecentMessages(DEFAULT_LIMIT, userId);
}

export async function getHistoryPage(params: {
  beforeServerId?: number;
  limit?: number;
  userId?: number;
}) {
  const { beforeServerId, limit = 20, userId = getCurrentUserId() } = params;
  await initDb();

  if (!beforeServerId) {
    return getRecentMessages(limit, userId);
  }

  const result = await executeSqlAsync(
    `SELECT m.*
     FROM messages m
     JOIN sessions s ON s.id = m.session_id
     WHERE s.user_id = ?
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
  sessionId?: number;
  timestamp?: Date;
  status?: "sending" | "sent" | "failed";
  userId?: number;
}) {
  const {
    textMessage,
    sessionId,
    timestamp = new Date(),
    status = "sending",
    userId = getCurrentUserId(),
  } = params;

  await initDb();
  const resolvedSessionId = await resolveSessionId(userId, sessionId);
  if (!resolvedSessionId) {
    throw new Error("No session available for local message");
  }

  const localId = await getNextLocalMessageId();
  const nowIso = new Date().toISOString();
  const ts = timestamp.toISOString();

  await executeSqlAsync(
    `INSERT INTO messages
      (id, session_id, role, textMessage, emotion_label, timestamp, client_status, synced, deleted_at, updated_at)
     VALUES (?, ?, 'user', ?, NULL, ?, ?, 0, NULL, ?);`,
    [localId, resolvedSessionId, textMessage, ts, status, nowIso]
  );

  return new Message({
    id: localId,
    sessionId: resolvedSessionId,
    isUser: true,
    textMessage,
    timestamp,
    status,
  });
}

export async function upsertServerMessages(
  messages: ServerMessage[],
  userId: number = getCurrentUserId()
) {
  await initDb();
  const nowIso = new Date().toISOString();

  const ensuredSessions = new Set<number>();
  for (const message of messages) {
    const normalized = normalizeServerMessage(message);
    if (!normalized.serverId || !normalized.sessionId) continue;
    if (!ensuredSessions.has(normalized.sessionId)) {
      await ensureSessionExists(normalized.sessionId, userId);
      ensuredSessions.add(normalized.sessionId);
    }

    await executeSqlAsync(
      `INSERT INTO messages
        (id, session_id, role, textMessage, emotion_label, timestamp, client_status, synced, deleted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'sent', 1, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET
        session_id=excluded.session_id,
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
        normalized.sessionId,
        normalized.role,
        normalized.textMessage,
        normalized.emotionLabel,
        normalized.timestamp,
        nowIso,
      ]
    );
  }

  await trimSyncedMessages(DEFAULT_LIMIT, userId);
}

export async function markMessageSynced(params: {
  localId: number;
  serverMessage?: ServerMessage;
  userId?: number;
}) {
  const { localId, serverMessage, userId = getCurrentUserId() } = params;
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
  userId: number = getCurrentUserId()
) {
  await initDb();
  await executeSqlAsync(
    `UPDATE messages
     SET client_status = ?, synced = CASE WHEN ? = 'sent' THEN 1 ELSE synced END, updated_at = ?
     WHERE id = ?
       AND session_id IN (SELECT id FROM sessions WHERE user_id = ?);`,
    [status, status, new Date().toISOString(), localId, userId]
  );
}

export async function getOldestServerId(userId: number = getCurrentUserId()) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT m.id AS message_id
     FROM messages m
     JOIN sessions s ON s.id = m.session_id
     WHERE s.user_id = ?
       AND m.synced = 1
       AND m.id > 0
       AND m.deleted_at IS NULL
     ORDER BY m.id ASC
     LIMIT 1;`,
    [userId]
  );
  const row = (result.rows as any).item(0);
  return row?.message_id ?? null;
}

export async function getLatestUserEmotionLabel(
  userId: number = getCurrentUserId()
) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT m.emotion_label
     FROM messages m
     JOIN sessions s ON s.id = m.session_id
     WHERE s.user_id = ?
       AND m.role = 'user'
       AND m.emotion_label IS NOT NULL
       AND m.deleted_at IS NULL
     ORDER BY datetime(m.timestamp) DESC, m.id DESC
     LIMIT 1;`,
    [userId]
  );
  const row = (result.rows as any).item(0);
  return row?.emotion_label ?? null;
}

export async function trimSyncedMessages(
  limit: number = DEFAULT_LIMIT,
  userId: number = getCurrentUserId()
) {
  await initDb();
  await executeSqlAsync(
    `DELETE FROM messages
     WHERE id IN (
       SELECT m.id
       FROM messages m
       JOIN sessions s ON s.id = m.session_id
       WHERE s.user_id = ?
         AND m.synced = 1
         AND m.deleted_at IS NULL
         AND m.id NOT IN (
           SELECT m2.id
           FROM messages m2
           JOIN sessions s2 ON s2.id = m2.session_id
           WHERE s2.user_id = ?
             AND m2.synced = 1
             AND m2.deleted_at IS NULL
           ORDER BY datetime(m2.timestamp) DESC, m2.id DESC
           LIMIT ?
         )
     );`,
    [userId, userId, limit]
  );
}
