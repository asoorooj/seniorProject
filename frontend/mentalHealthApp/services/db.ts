import { TEST_USER } from "@/components/userTest";
import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import type { SQLiteRunResult } from "expo-sqlite";
import type { User } from "@/hooks/useAuth";

type RowSet = {
  length: number;
  item: (index: number) => any;
};

export type SQLResultSetLike = {
  rows: RowSet;
  insertId?: number;
  rowsAffected?: number;
};

let db: SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;
let currentUserId = TEST_USER.userId;

export type LocalAuthState = {
  user: User;
  sessionId: number;
};

function getDb() {
  if (!db) {
    db = SQLite.openDatabaseSync("app.db");
  }
  return db;
}

async function createCoreSchema(database: SQLiteDatabase) {
  await database.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- =========================
      -- USER (matches Flask User)
      -- =========================
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        external_id TEXT UNIQUE,
        email TEXT,
        created_at TEXT,
        consent_timestamp TEXT,

        pref_eval_face INTEGER,
        pref_eval_audio INTEGER,
        pref_eval_text INTEGER,

        synced INTEGER DEFAULT 0,
        updated_at TEXT
      );

      -- =========================
      -- SESSION (matches Flask Session)
      -- =========================
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        started_at TEXT,
        last_seen_at TEXT,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions (user_id);

      -- =========================
      -- MESSAGE (matches Flask Message)
      -- =========================
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY,

        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,              -- "user" | "assistant"
        textMessage TEXT NOT NULL,
        emotion_label TEXT,
        timestamp TEXT,
        client_status TEXT DEFAULT 'sent',

        synced INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages (session_id);

      -- =========================
      -- PREDICTION (matches Flask Prediction)
      -- =========================
      CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY,

        session_id INTEGER NOT NULL,
        modality TEXT NOT NULL,          -- text / face / audio
        label TEXT NOT NULL,
        confidence REAL,
        raw_probs TEXT,                  -- store JSON string
        timestamp TEXT,

        synced INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_predictions_session
      ON predictions (session_id);

      -- =========================
      -- EVALUATION (matches Flask Evaluation)
      -- =========================
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,

        timestamp TEXT,
        label TEXT,
        scores TEXT,                     -- JSON string
        suggestion TEXT,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_evaluations_user
      ON evaluations (user_id);

      -- =========================
      -- AUDIO / IMAGE / TEXT EVALUATION
      -- (flattened local cache version)
      -- =========================

      CREATE TABLE IF NOT EXISTS audio_evaluations (
        id INTEGER PRIMARY KEY,
        evaluation_id INTEGER,
        label TEXT,
        scores TEXT,
        data BLOB,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS image_evaluations (
        id INTEGER PRIMARY KEY,
        evaluation_id INTEGER,
        label TEXT,
        scores TEXT,
        data BLOB,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS text_evaluations (
        id INTEGER PRIMARY KEY,
        evaluation_id INTEGER,
        label TEXT,
        scores TEXT,
        data TEXT,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
      );

      -- =========================
      -- SYNC ENGINE TABLES
      -- =========================
      CREATE TABLE IF NOT EXISTS sync_state (
        user_id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        messages_cursor TEXT,
        journal_cursor TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_eval_evaluation_id
      ON audio_evaluations (evaluation_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_image_eval_evaluation_id
      ON image_evaluations (evaluation_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_text_eval_evaluation_id
      ON text_evaluations (evaluation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_updated_at
      ON messages (updated_at);
      CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp
      ON evaluations (timestamp);
      CREATE INDEX IF NOT EXISTS idx_outbox_user_created
      ON outbox (user_id, created_at);
    `);
}

async function getMessagesColumnSet(database: SQLiteDatabase) {
  const rows = await database.getAllAsync<any>(`PRAGMA table_info(messages);`);
  return new Set(rows.map((row) => String(row.name)));
}

async function getMetaValue(database: SQLiteDatabase, key: string) {
  const rows = await database.getAllAsync<any>(
    `SELECT value FROM app_meta WHERE key = ? LIMIT 1;`,
    [key]
  );
  return rows[0]?.value ?? null;
}

async function setMetaValue(database: SQLiteDatabase, key: string, value: string) {
  await database.runAsync(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value;`,
    [key, value]
  );
}

async function resetLocalTables(database: SQLiteDatabase) {
  await database.execAsync(`
      DROP TABLE IF EXISTS outbox;
      DROP TABLE IF EXISTS sync_state;
      DROP TABLE IF EXISTS text_evaluations;
      DROP TABLE IF EXISTS image_evaluations;
      DROP TABLE IF EXISTS audio_evaluations;
      DROP TABLE IF EXISTS evaluations;
      DROP TABLE IF EXISTS predictions;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS users;
  `);
}

export async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const database = getDb();
    await createCoreSchema(database);
    const requiredMessageColumns = new Set([
      "id",
      "session_id",
      "role",
      "textMessage",
      "timestamp",
      "synced",
      "client_status",
    ]);
    const actualColumns = await getMessagesColumnSet(database);
    const isCompatible = Array.from(requiredMessageColumns).every((col) =>
      actualColumns.has(col)
    );

    if (!isCompatible) {
      const alreadyReset = (await getMetaValue(database, "schema_reset_v2_done")) === "1";
      console.warn(
        "[db] schema mismatch detected for messages table",
        { columns: Array.from(actualColumns), alreadyReset }
      );
      if (!alreadyReset) {
        console.warn("[db] performing one-time local schema reset");
        await resetLocalTables(database);
        await createCoreSchema(database);
        await setMetaValue(database, "schema_reset_v2_done", "1");
      } else {
        // Defensive: if mismatch persists, force rebuild again instead of staying broken.
        console.warn("[db] schema still incompatible after prior reset; forcing rebuild");
        await resetLocalTables(database);
        await createCoreSchema(database);
      }
    }
  })();
  return initPromise;
}

export function setCurrentUserId(userId: number) {
  currentUserId = userId;
}

export function getCurrentUserId() {
  return currentUserId;
}

export async function persistAuthSession(
  user: User,
  sessionId: number
): Promise<void> {
  await initDb();
  const nowIso = new Date().toISOString();
  await executeSqlAsync(
    `INSERT INTO users
      (id, external_id, email, created_at, consent_timestamp, pref_eval_face, pref_eval_audio, pref_eval_text, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
      external_id=excluded.external_id,
      email=excluded.email,
      created_at=excluded.created_at,
      consent_timestamp=excluded.consent_timestamp,
      pref_eval_face=excluded.pref_eval_face,
      pref_eval_audio=excluded.pref_eval_audio,
      pref_eval_text=excluded.pref_eval_text,
      synced=1,
      updated_at=excluded.updated_at;`,
    [
      user.id,
      user.external_id,
      user.email,
      user.created_at,
      user.consent_timestamp ?? null,
      user.pref_eval_face ? 1 : 0,
      user.pref_eval_audio ? 1 : 0,
      user.pref_eval_text ? 1 : 0,
      nowIso,
    ]
  );
  await executeSqlAsync(
    `INSERT INTO sessions (id, user_id, started_at, last_seen_at, synced)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
      user_id=excluded.user_id,
      started_at=excluded.started_at,
      last_seen_at=excluded.last_seen_at,
      synced=1;`,
    [sessionId, user.id, nowIso, nowIso]
  );
  setCurrentUserId(user.id);
}

export async function restoreAuthSession(): Promise<LocalAuthState | null> {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT
        s.id AS session_id,
        u.id AS user_id,
        u.external_id,
        u.email,
        u.created_at,
        u.consent_timestamp,
        u.pref_eval_face,
        u.pref_eval_audio,
        u.pref_eval_text
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     ORDER BY datetime(COALESCE(s.last_seen_at, s.started_at)) DESC, s.id DESC
     LIMIT 1;`
  );
  const row = (result.rows as any).item(0);
  if (!row) return null;
  const user: User = {
    id: Number(row.user_id),
    external_id: String(row.external_id ?? ""),
    email: String(row.email ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    consent_timestamp: row.consent_timestamp ?? undefined,
    pref_eval_face: Boolean(row.pref_eval_face),
    pref_eval_audio: Boolean(row.pref_eval_audio),
    pref_eval_text: Boolean(row.pref_eval_text),
  };
  const sessionId = Number(row.session_id);
  setCurrentUserId(user.id);
  return { user, sessionId };
}

export async function clearAuthSession() {
  await initDb();
  await executeSqlAsync(`DELETE FROM sessions;`);
  await executeSqlAsync(`DELETE FROM users;`);
  currentUserId = TEST_USER.userId;
}

function makeRowSet(rows: any[]): RowSet {
  return {
    length: rows.length,
    item: (index: number) => rows[index],
  };
}

export async function executeSqlAsync(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLResultSetLike> {
  const database = getDb();
  const isSelect = /^\s*(select|pragma|with)\b/i.test(sql);
  if (isSelect) {
    const rows = await database.getAllAsync<any>(sql, params as any);
    return { rows: makeRowSet(rows) };
  }
  const result: SQLiteRunResult = await database.runAsync(sql, params as any);
  return {
    rows: makeRowSet([]),
    insertId: result.lastInsertRowId,
    rowsAffected: result.changes,
  };
}

export async function clearDatabase() {
  await initDb();

  const tables = [
    "users",
    "sessions",
    "messages",
    "predictions",
    "evaluations",
    "audio_evaluations",
    "image_evaluations",
    "text_evaluations",
    "sync_state",
    "outbox",
    "app_meta",
  ];

  for (const table of tables) {
    await executeSqlAsync(`DELETE FROM ${table};`);
  }

  // optional: reset any in-memory state
  currentUserId = TEST_USER.userId;
}
