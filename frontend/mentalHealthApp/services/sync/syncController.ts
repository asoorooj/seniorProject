import {
  clearDatabase,
  executeSqlAsync,
  initDb,
} from "@/services/db";
import {
  fetchChatHistory,
  fetchEvaluationsByDate,
  sendChatMessage,
} from "@/services/apiService";
import {
  addLocalMessage,
  getOldestServerId,
  markMessageSynced,
  trimSyncedMessages,
  updateMessageStatus,
  upsertServerMessages,
} from "@/services/repositories/chatRepository";
import {
  trimToRecentWeeks,
  upsertServerEntries,
} from "@/services/repositories/journalRepository";
import AsyncStorage from "@react-native-async-storage/async-storage";

type OutboxItem = {
  id: number;
  user_id: number;
  type: "message" | "journal";
  payload_json: string;
};

type SyncReason = "startup" | "manual" | "action";

let syncInFlight: Promise<SyncReason | null> | null = null;
let lastSyncStartedAt = 0;
let unauthorizedHandler: (() => Promise<void> | void) | null = null;

function getWeekStartLocal(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekStartDateString(date: Date) {
  const d = getWeekStartLocal(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function isUnauthorizedError(err: unknown) {
  return err instanceof Error && err.message === "UNAUTHORIZED";
}

async function handleUnauthorized() {
  if (!unauthorizedHandler) return;
  await Promise.resolve(unauthorizedHandler());
}

export function setSyncUnauthorizedHandler(handler: (() => Promise<void> | void) | null) {
  unauthorizedHandler = handler;
}

async function getSyncState(userId: number) {
  await initDb();
  const result = await executeSqlAsync(
    "SELECT * FROM sync_state WHERE user_id = ?;",
    [userId]
  );
  const row = (result.rows as any).item(0);
  return row ?? null;
}

async function setSyncState(
  userId: number,
  state: Partial<{
    last_sync_at: string;
    messages_cursor: string | null;
    journal_cursor: string | null;
  }>
) {
  await initDb();
  const nowIso = new Date().toISOString();
  await executeSqlAsync(
    `INSERT INTO sync_state (user_id, last_sync_at, messages_cursor, journal_cursor, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
      last_sync_at = COALESCE(excluded.last_sync_at, sync_state.last_sync_at),
      messages_cursor = COALESCE(excluded.messages_cursor, sync_state.messages_cursor),
      journal_cursor = COALESCE(excluded.journal_cursor, sync_state.journal_cursor),
      updated_at = excluded.updated_at;`,
    [
      userId,
      state.last_sync_at ?? nowIso,
      state.messages_cursor ?? null,
      state.journal_cursor ?? null,
      nowIso,
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
  jwt?: string;
  timestamp: Date;
  userId?: number;
}) {
  const {
    localId,
    textMessage,
    jwt,
    timestamp,
    userId
  } = params;
  await initDb();
  await executeSqlAsync(
    `INSERT INTO outbox (user_id, type, payload_json, created_at, attempts)
     VALUES (?, ?, ?, ?, 0);`,
    [
      userId ?? await AsyncStorage.getItem("id"),
      "message",
      JSON.stringify({
        localId,
        textMessage,
        jwt,
        timestamp: timestamp.toISOString(),
      }),
      new Date().toISOString(),
    ]
  );
}

export async function syncOutbox(
  userId: number,
  jwt?: string | null
) {
  if (!jwt) return [];
  const items = await listOutbox(userId);
  const responses: any[] = [];

  for (const item of items) {
    if (item.type !== "message") {
      await markOutboxAttempt(item.id, "Unsupported outbox type");
      continue;
    }

    try {
      const payload = JSON.parse(item.payload_json);
      const res = await sendChatMessage({
        jwt,
        message: payload.textMessage
      });

      if (!res) {
        throw new Error("Chat send failed");
      }

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
      if (isUnauthorizedError(err)) {
        throw err;
      }
      await updateMessageStatus(
        JSON.parse(item.payload_json).localId,
        "failed",
        userId
      );
      await markOutboxAttempt(item.id, String(err?.message ?? err));
    }
  }

  return responses;
}

export async function syncMessages(
  userId: number,
  jwt: string
) {
  if (!jwt) return null;
  const state = await getSyncState(userId);
  const cursor = state?.messages_cursor ?? null;
  const data = await fetchChatHistory({ jwt, cursor, limit: 50 });
  if (!data) return null;

  if (data?.messages) {
    await upsertServerMessages(data.messages, userId);
  }

  const nextCursor =
    data?.next_cursor ?? data?.next_before_id ?? data?.cursor ?? null;
  await setSyncState(userId, {
    last_sync_at: new Date().toISOString(),
    messages_cursor: nextCursor ? String(nextCursor) : null,
  });
  await trimSyncedMessages(50, userId);
  return data;
}

export async function syncMessagesBefore(params: {
  beforeId: number;
  userId?: number;
  jwt?: string;
}) {
  const { beforeId, userId, jwt } = params;
  const data = await fetchChatHistory({jwt, beforeId, limit: 20 });
  if (data?.messages) {
    await upsertServerMessages(data.messages, userId);
  }
  await trimSyncedMessages(50, userId);
  return data;
}

export async function syncJournalWeek(
  weekStart: Date,
  userId?: number,
  jwt?: string | null
) {
  userId = userId ?? Number(await AsyncStorage.getItem("id"));
  if (!jwt) return null;
  const data = await fetchEvaluationsByDate({
    jwt,
    userId,
    startDate: weekStartDateString(weekStart),
  });
  if (data?.evaluations) {
    await upsertServerEntries(data.evaluations, userId);
  }
  const cutoff = getWeekStartLocal(new Date());
  cutoff.setDate(cutoff.getDate() - 7 * 8);
  await trimToRecentWeeks(cutoff, userId);
  return data;
}

async function warmRecentJournalWindow(
  userId?: number,
  jwt?: string,
  weeks = 8
) {
  const currentWeekStart = getWeekStartLocal(new Date());
  for (let i = 0; i < weeks; i += 1) {
    const target = new Date(currentWeekStart);
    target.setDate(target.getDate() - i * 7);
    await syncJournalWeek(target, userId, jwt);
  }
}

async function getHydrationCounts(userId: number) {
  const messageCountResult = await executeSqlAsync(
    `SELECT COUNT(*) AS total
     FROM messages m
     WHERE user_id = ? AND m.deleted_at IS NULL;`,
    [userId]
  );
  const evalCountResult = await executeSqlAsync(
    `SELECT COUNT(*) AS total
     FROM evaluations
     WHERE user_id = ?;`,
    [userId]
  );
  return {
    messages: Number((messageCountResult.rows as any).item(0)?.total ?? 0),
    evaluations: Number((evalCountResult.rows as any).item(0)?.total ?? 0),
  };
}

export async function syncAllUnsynced(
  jwt?: string | null,
  reason: SyncReason = "manual"
) {
  if (!jwt) return null;

  const now = Date.now();
  if (syncInFlight) return syncInFlight;
  if (now - lastSyncStartedAt < 800) return null;
  lastSyncStartedAt = now;

  syncInFlight = (async () => {
    const userId = await AsyncStorage.getItem("id");
    try {
      await initDb();
      let messagePhaseOk = false;
      try {
        await syncOutbox(Number(userId), jwt);
        const messageData = await syncMessages(Number(userId), jwt);
        messagePhaseOk = Boolean(messageData);
        if (!messagePhaseOk) {
          console.warn("[sync] message phase returned no data; UI may remain stale until retry");
        }
      } catch (err) {
        if (isUnauthorizedError(err)) {
          throw err;
        }
        console.warn("[sync] message phase failed", err);
      }

      try {
        await warmRecentJournalWindow(Number(userId), jwt, 8);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          throw err;
        }
        console.warn("[sync] journal phase failed", err);
      }

      await setSyncState(Number(userId), {
        last_sync_at: new Date().toISOString(),
      });
      const counts = await getHydrationCounts(Number(userId));
      console.log("[sync] hydration counts", {
        reason,
        messagePhaseOk,
        messages: counts.messages,
        evaluations: counts.evaluations,
      });
      return reason;
    } catch (err) {
      if (isUnauthorizedError(err)) {
        await handleUnauthorized();
        return null;
      }
      console.warn("[sync] syncAllUnsynced failed", err);
      return null;
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

export async function syncAll(
  reason: "startup" | "manual" = "manual",
  jwt?: string | null
) {
  return syncAllUnsynced(jwt, reason);
}

export async function clearLocalData() {
  // await clearDatabase();
}

export async function switchUserAndSync(jwt?: string | null) {
  // await clearDatabase();
  await syncAllUnsynced(jwt, "manual");
}

export async function ensureMessageOutboxAndLocal(params: {
  textMessage: string;
  jwt?: string;
  userId?: number;
}) {
  const { textMessage, jwt, userId } = params;
  const message = await addLocalMessage({
    textMessage,
    userId: (userId ?? Number(await AsyncStorage.getItem("id"))),
  });
  if (message.id != null) {
    await enqueueMessageOutbox({
      localId: Number(message.id),
      textMessage,
      jwt,
      timestamp: message.timestamp,
      userId,
    });
  }
  return message;
}

export async function getFallbackBeforeId(userId?: number) {
  return getOldestServerId(userId);
}
