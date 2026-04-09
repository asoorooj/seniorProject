import { executeSqlAsync, getCurrentUserId, initDb } from "@/services/db";
import { Message } from "@/components/chat/Message";

const DEFAULT_LIMIT = 50;

type ServerMessage = Record<string, any>;

function normalizeServerMessage(message: ServerMessage) {
  const serverId = message.id ?? message.server_id ?? null;
  const sessionId = message.sessionId ?? message.session_id ?? null;
  const isUser =
    typeof message.isUser === "boolean"
      ? message.isUser
      : message.role === "user";
  const textMessage =
    message.textMessage ?? message.text_message ?? message.message ?? "";
  const timestamp = message.timestamp ?? message.created_at ?? new Date().toISOString();
  const emotionLabel = message.emotionLabel ?? message.emotion_label ?? null;

  return {
    serverId,
    sessionId,
    isUser: Boolean(isUser),
    textMessage: String(textMessage),
    timestamp: new Date(timestamp),
    emotionLabel,
  };
}

export async function getRecentMessages(
  limit: number = DEFAULT_LIMIT,
  userId: number = getCurrentUserId()
) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY datetime(timestamp) DESC, is_user DESC, COALESCE(server_id, local_id) DESC
       LIMIT ?
     )
     ORDER BY datetime(timestamp) ASC, is_user DESC, COALESCE(server_id, local_id) ASC;`,
    [userId, limit]
  );
  const rows = result.rows as any;
  const items = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i);
    items.push(
      new Message({
        id: row.server_id ?? row.local_id,
        sessionId: row.session_id ?? undefined,
        isUser: Boolean(row.is_user),
        textMessage: row.text,
        timestamp: new Date(row.timestamp),
        status: row.status ?? undefined,
      })
    );
  }
  return items;
}

export async function getAllMessages(userId: number = getCurrentUserId()) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT * FROM messages
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY datetime(timestamp) ASC, is_user DESC, COALESCE(server_id, local_id) ASC;`,
    [userId]
  );
  const rows = result.rows as any;
  const items: Message[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i);
    items.push(
      new Message({
        id: row.server_id ?? row.local_id,
        sessionId: row.session_id ?? undefined,
        isUser: Boolean(row.is_user),
        textMessage: row.text,
        timestamp: new Date(row.timestamp),
        status: row.status ?? undefined,
      })
    );
  }
  return items;
}

export async function getHistoryPage(params: {
  beforeServerId?: number;
  limit?: number;
  userId?: number;
}) {
  const { beforeServerId, limit = 20, userId = getCurrentUserId() } = params;
  await initDb();
  if (beforeServerId) {
    const result = await executeSqlAsync(
      `SELECT * FROM messages
       WHERE user_id = ? AND deleted_at IS NULL AND server_id IS NOT NULL AND server_id < ?
       ORDER BY server_id DESC
       LIMIT ?;`,
      [userId, beforeServerId, limit]
    );
    const rows = result.rows as any;
    const items: Message[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows.item(i);
      items.push(
        new Message({
          id: row.server_id ?? row.local_id,
          sessionId: row.session_id ?? undefined,
          isUser: Boolean(row.is_user),
          textMessage: row.text,
          timestamp: new Date(row.timestamp),
          status: row.status ?? undefined,
        })
      );
    }
    return items.reverse();
  }

  return getRecentMessages(limit, userId);
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
  const nowIso = new Date().toISOString();
  const ts = timestamp.toISOString();
  const result = await executeSqlAsync(
    `INSERT INTO messages
      (server_id, user_id, session_id, is_user, text, timestamp, status, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [null, userId, sessionId ?? null, 1, textMessage, ts, status, 0, nowIso]
  );
  const localId = result.insertId ?? undefined;
  return new Message({
    id: localId,
    sessionId,
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
  for (const message of messages) {
    const normalized = normalizeServerMessage(message);
    if (!normalized.serverId) continue;
    await executeSqlAsync(
      `INSERT INTO messages
        (server_id, user_id, session_id, is_user, text, timestamp, status, emotion_label, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(server_id) DO UPDATE SET
        session_id=excluded.session_id,
        is_user=excluded.is_user,
        text=excluded.text,
        timestamp=excluded.timestamp,
        status=excluded.status,
        emotion_label=excluded.emotion_label,
        synced=1,
        updated_at=excluded.updated_at;`,
      [
        normalized.serverId,
        userId,
        normalized.sessionId ?? null,
        normalized.isUser ? 1 : 0,
        normalized.textMessage,
        normalized.timestamp.toISOString(),
        "sent",
        normalized.emotionLabel,
        nowIso,
      ]
    );
  }
}

export async function markMessageSynced(params: {
  localId: number;
  serverMessage?: ServerMessage;
  userId?: number;
}) {
  const { localId, serverMessage, userId = getCurrentUserId() } = params;
  await initDb();
  if (serverMessage) {
    const normalized = normalizeServerMessage(serverMessage);
    await executeSqlAsync(
      `UPDATE messages SET
        server_id = ?,
        session_id = ?,
        status = ?,
        emotion_label = ?,
        synced = 1,
        updated_at = ?
       WHERE local_id = ? AND user_id = ?;`,
      [
        normalized.serverId ?? null,
        normalized.sessionId ?? null,
        "sent",
        normalized.emotionLabel,
        new Date().toISOString(),
        localId,
        userId,
      ]
    );
  } else {
    await executeSqlAsync(
      `UPDATE messages SET
        status = ?,
        synced = 1,
        updated_at = ?
       WHERE local_id = ? AND user_id = ?;`,
      ["sent", new Date().toISOString(), localId, userId]
    );
  }
}

export async function updateMessageStatus(
  localId: number,
  status: "sending" | "sent" | "failed",
  userId: number = getCurrentUserId()
) {
  await initDb();
  await executeSqlAsync(
    `UPDATE messages SET status = ?, updated_at = ? WHERE local_id = ? AND user_id = ?;`,
    [status, new Date().toISOString(), localId, userId]
  );
}

export async function getOldestServerId(userId: number = getCurrentUserId()) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT server_id FROM messages
     WHERE user_id = ? AND server_id IS NOT NULL
     ORDER BY server_id ASC LIMIT 1;`,
    [userId]
  );
  const row = (result.rows as any).item(0);
  return row?.server_id ?? null;
}

export async function getLatestUserEmotionLabel(
  userId: number = getCurrentUserId()
) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT emotion_label FROM messages
     WHERE user_id = ? AND is_user = 1 AND emotion_label IS NOT NULL
     ORDER BY datetime(timestamp) DESC LIMIT 1;`,
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
     WHERE user_id = ? AND synced = 1 AND local_id NOT IN (
       SELECT local_id FROM messages
       WHERE user_id = ? AND synced = 1
       ORDER BY datetime(timestamp) DESC
       LIMIT ?
     );`,
    [userId, userId, limit]
  );
}
