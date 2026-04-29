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

export type LocalAuthState = {
  user: User;
};

function getDb() {
  if (!db) {
    db = SQLite.openDatabaseSync("app.db");
  }
  return db;
}

function normalizeTimestampString(value: string): string {
  const raw = value.trim().replace(" ", "T");
  const hasTimezone = /(Z|[+-]\d{2}:\d{2}|[+-]\d{4})$/i.test(raw);
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !hasTimezone) {
    return `${raw}Z`;
  }
  return raw;
}

function parseTimestampToEpochMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Accept seconds-era numbers and normalize to ms.
    return value < 1_000_000_000_000 ? Math.trunc(value * 1000) : Math.trunc(value);
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000
        ? Math.trunc(numeric * 1000)
        : Math.trunc(numeric);
    }
    const parsed = Date.parse(normalizeTimestampString(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function migrateTableTimestampsToInteger(
  database: SQLiteDatabase,
  table: "messages" | "evaluations"
) {
  const rows = await database.getAllAsync<{ rowid: number; timestamp: unknown }>(
    `SELECT rowid, timestamp FROM ${table};`
  );
  let migrated = 0;
  for (const row of rows) {
    const parsed = parseTimestampToEpochMs(row.timestamp);
    if (parsed == null) continue;
    if (typeof row.timestamp === "number" && Math.trunc(row.timestamp) === parsed) {
      continue;
    }
    await database.runAsync(
      `UPDATE ${table} SET timestamp = ? WHERE rowid = ?;`,
      [parsed, row.rowid] as any
    );
    migrated += 1;
  }
  if (migrated > 0) {
    console.log(`[db] migrated ${migrated} ${table}.timestamp values to epoch ms`);
  }
}

async function migrateLegacyTimestampStorage(database: SQLiteDatabase) {
  await migrateTableTimestampsToInteger(database, "messages");
  await migrateTableTimestampsToInteger(database, "evaluations");
}

async function createCoreSchema(database: SQLiteDatabase) {

  // await resetLocalTables(database);

  console.log("CREATE CORE SCHEMA");

  await database.execAsync(`

      -- =========================
      -- MESSAGE (matches Flask Message)
      -- =========================
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,

        role TEXT NOT NULL,              -- "user" | "assistant"
        textMessage TEXT NOT NULL,
        emotion_label TEXT,
        timestamp INTEGER,
        client_status TEXT DEFAULT 'sent',

        synced INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT
      );

      -- =========================
      -- EVALUATION (matches Flask Evaluation)
      -- =========================
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,

        timestamp INTEGER,
        label TEXT,
        scores TEXT,                     -- JSON string
        suggestion TEXT,
        synced INTEGER DEFAULT 0
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
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT
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
      CREATE INDEX IF NOT EXISTS idx_messages_user_ts_id
      ON messages (user_id, timestamp, id);
      CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp
      ON evaluations (timestamp);
      CREATE INDEX IF NOT EXISTS idx_outbox_user_created
      ON outbox (user_id, created_at);
    `);
}

export async function resetLocalTables(database: SQLiteDatabase) {

  console.log("RESET TABLES");

  await database.execAsync(`
    PRAGMA writable_schema = 1;
    DELETE FROM sqlite_master WHERE type IN ('table', 'index', 'trigger');
    PRAGMA writable_schema = 0;
    VACUUM;
  `);
}

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = getDb();

    console.log("[db] init start");

    // await resetLocalTables(database);
    await createCoreSchema(database);
    await migrateLegacyTimestampStorage(database);

    console.log("[db] init complete");
  })();

  return initPromise;
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
  // const database = getDb();

  console.log("CLEAR DB");

  const tables = [
    "messages",
    "evaluations",
    "audio_evaluations",
    "image_evaluations",
    "text_evaluations",
    "sync_state",
    "outbox",
  ];

  for (const table of tables) {
    await executeSqlAsync(`DELETE FROM ${table};`);
  }
}
