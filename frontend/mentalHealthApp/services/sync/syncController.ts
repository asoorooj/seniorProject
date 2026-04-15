import {
  executeSqlAsync,
  clearDatabase,
  getCurrentUserId,
  initDb,
  setCurrentUserId,
} from "@/services/db";
import {
  fetchChatHistory,
  fetchEmotionalProfile,
  fetchEvaluationsByDate,
  fetchProfile,
  fetchWeeklyScores,
  sendChatMessage,
} from "@/services/apiService";
import {
  addLocalMessage,
  getOldestServerId,
  markMessageSynced,
  trimSyncedMessages,
  upsertServerMessages,
  updateMessageStatus,
} from "@/services/repositories/chatRepository";
import {
  trimToRecentWeeks,
  upsertServerEntries,
} from "@/services/repositories/journalRepository";
import {
  setEmotionsCache,
  setProfileCache,
  setScoresCache,
} from "@/services/repositories/profileRepository";

type OutboxItem = {
  id: number;
  user_id: number;
  type: "message" | "journal";
  payload_json: string;
};

async function getSyncState(userId: number) {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM sync_state WHERE user_id = ?;",
    [userId]
  );
  const row = (result.rows as any).item(0);
  return row ?? null;
}

async function setSyncState(userId: number, state: Partial<{
  last_sync_at: string;
  messages_cursor: string | null;
  journal_cursor: string | null;
}>) {
  await initDb();
  const nowIso = new Date().toISOString();
  await executeSqlAsync(
    `INSERT INTO sync_state (user_id, last_sync_at, messages_cursor, journal_cursor)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       last_sync_at = COALESCE(?, sync_state.last_sync_at),
       messages_cursor = COALESCE(?, sync_state.messages_cursor),
       journal_cursor = COALESCE(?, sync_state.journal_cursor);`,
    [
      userId,
      state.last_sync_at ?? nowIso,
      state.messages_cursor ?? null,
      state.journal_cursor ?? null,
      state.last_sync_at ?? null,
      state.messages_cursor ?? null,
      state.journal_cursor ?? null,
    ]
  );
}

async function listOutbox(userId: number) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT * FROM outbox WHERE user_id = ? ORDER BY datetime(created_at) ASC;`,
    [userId]
  );
  const rows = result.rows as any;
  const items: OutboxItem[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rows.item(i));
  }
  return items;
}

async function markOutboxAttempt(itemId: number, error?: string) {
  await initDb();
  await executeSqlAsync(
    `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?;`,
    [error ?? null, itemId]
  );
}

async function deleteOutboxItem(itemId: number) {
  await initDb();
  await executeSqlAsync(`DELETE FROM outbox WHERE id = ?;`, [itemId]);
}

export async function enqueueMessageOutbox(params: {
  localId: number;
  textMessage: string;
  sessionId?: number;
  timestamp: Date;
  userId?: number;
}) {
  const {
    localId,
    textMessage,
    sessionId,
    timestamp,
    userId = getCurrentUserId(),
  } = params;
  await initDb();
  await executeSqlAsync(
    `INSERT INTO outbox (user_id, type, payload_json, created_at, attempts)
     VALUES (?, ?, ?, ?, 0);`,
    [
      userId,
      "message",
      JSON.stringify({
        localId,
        textMessage,
        sessionId,
        timestamp: timestamp.toISOString(),
      }),
      new Date().toISOString(),
    ]
  );
}

export async function syncOutbox(userId: number = getCurrentUserId()) {
  console.log("[sync] outbox:start", { userId });
  const items = await listOutbox(userId);
  const responses: any[] = [];
  for (const item of items) {
    if (item.type === "message") {
      try {
        const payload = JSON.parse(item.payload_json);
        const res = await sendChatMessage({
          userId,
          message: {
            sessionId: payload.sessionId ?? null,
            isUser: true,
            textMessage: payload.textMessage,
            timestamp: payload.timestamp,
          },
        });
        if (res?.user_message) {
          await markMessageSynced({
            localId: payload.localId,
            serverMessage: res.user_message,
            userId,
          });
        } else {
          await updateMessageStatus(payload.localId, "sent", userId);
        }
        if (res?.response_message) {
          await upsertServerMessages([res.response_message], userId);
        }
        responses.push(res);
        await deleteOutboxItem(item.id);
      } catch (err: any) {
        await updateMessageStatus(
          JSON.parse(item.payload_json).localId,
          "failed",
          userId
        );
        await markOutboxAttempt(item.id, String(err?.message ?? err));
        console.warn("[sync] outbox:item_failed", { id: item.id });
      }
    } else {
      await markOutboxAttempt(item.id, "Journal sync not implemented");
      console.warn("[sync] outbox:unsupported_type", { id: item.id });
    }
  }
  console.log("[sync] outbox:done", { count: items.length });
  return responses;
}

export async function syncMessages(userId: number = getCurrentUserId()) {
  console.log("[sync] messages:start", { userId });
  const state = await getSyncState(userId);
  const cursor = state?.messages_cursor ?? null;
  const data = await fetchChatHistory({ userId, cursor });
  if (data?.messages) {
    await upsertServerMessages(data.messages, userId);
  }
  const nextCursor =
    data?.next_cursor ?? data?.next_before_id ?? data?.cursor ?? null;
  if (nextCursor) {
    await setSyncState(userId, { messages_cursor: String(nextCursor) });
  }
  await trimSyncedMessages(50, userId);
  console.log("[sync] messages:done", { count: data?.messages?.length ?? 0 });
  return data;
}

export async function syncMessagesBefore(params: {
  beforeId: number;
  userId?: number;
}) {
  const { beforeId, userId = getCurrentUserId() } = params;
  console.log("[sync] messagesBefore:start", { userId, beforeId });
  const data = await fetchChatHistory({ userId, beforeId });
  if (data?.messages) {
    await upsertServerMessages(data.messages, userId);
  }
  await trimSyncedMessages(50, userId);
  console.log("[sync] messagesBefore:done", { count: data?.messages?.length ?? 0 });
  return data;
}

function getWeekStartLocal(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function syncJournalWeek(
  weekStart: Date,
  userId: number = getCurrentUserId()
) {
  console.log("[sync] journal:start", { userId });
  const start = getWeekStartLocal(weekStart);
  const startDate = `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  const data = await fetchEvaluationsByDate({
    userId,
    startDate,
  });
  if (data?.evaluations) {
    await upsertServerEntries(data.evaluations, userId);
  }
  const cutoff = getWeekStartLocal(new Date());
  cutoff.setDate(cutoff.getDate() - 7 * 7);
  await trimToRecentWeeks(cutoff, userId);
  console.log("[sync] journal:done", { count: data?.evaluations?.length ?? 0 });
  return data;
}

export async function syncProfileCaches(userId: number = getCurrentUserId()) {
  console.log("[sync] profile:start", { userId });
  const [profile, scores, emotions] = await Promise.all([
    fetchProfile(),
    fetchWeeklyScores(),
    fetchEmotionalProfile(),
  ]);
  await Promise.all([
    setProfileCache(profile, userId),
    setScoresCache(scores, userId),
    setEmotionsCache(emotions, userId),
  ]);
  console.log("[sync] profile:done");
  return { profile, scores, emotions };
}

let syncRetryTimeout: ReturnType<typeof setTimeout> | null = null;
let syncRetryAttempts = 0;
const MAX_SYNC_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 3000;

function scheduleSyncRetry(reason: "startup" | "manual") {
  if (syncRetryTimeout) return;
  if (syncRetryAttempts >= MAX_SYNC_RETRIES) {
    console.warn("[sync] all:retry_exhausted", { attempts: syncRetryAttempts });
    return;
  }
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, syncRetryAttempts);
  syncRetryAttempts += 1;
  console.warn("[sync] all:retry_scheduled", { attempt: syncRetryAttempts, delay });
  syncRetryTimeout = setTimeout(() => {
    syncRetryTimeout = null;
    syncAll(reason).catch(() => {});
  }, delay);
}

export async function syncAll(reason: "startup" | "manual" = "manual") {
  const userId = getCurrentUserId();
  console.log("[sync] all:start", { reason, userId });
  try {
    await initDb();
    await syncOutbox(userId);
    await syncMessages(userId);
    await syncJournalWeek(new Date(), userId);
    // await syncProfileCaches(userId);
    await setSyncState(userId, { last_sync_at: new Date().toISOString() });
    syncRetryAttempts = 0;
    console.log("[sync] all:success", { reason });
    return reason;
  } catch (err) {
    console.error("[sync] all:failed", { reason, err });
    scheduleSyncRetry(reason);
    return null;
  }
}

export async function clearLocalData() {
  await clearDatabase();
}

export async function switchUserAndSync(userId: number) {
  await clearDatabase();
  setCurrentUserId(userId);
  await syncAll("manual");
}

export async function ensureMessageOutboxAndLocal(params: {
  textMessage: string;
  sessionId?: number;
  userId?: number;
}) {
  const {
    textMessage,
    sessionId,
    userId = getCurrentUserId(),
  } = params;
  const message = await addLocalMessage({
    textMessage,
    sessionId,
    userId,
  });
  if (message.id) {
    await enqueueMessageOutbox({
      localId: Number(message.id),
      textMessage,
      sessionId,
      timestamp: message.timestamp,
      userId,
    });
  }
  return message;
}

export async function getFallbackBeforeId(userId: number = getCurrentUserId()) {
  return getOldestServerId(userId);
}
