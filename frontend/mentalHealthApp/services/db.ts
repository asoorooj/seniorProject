import { TEST_USER } from "@/components/userTest";
import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import type { SQLiteRunResult } from "expo-sqlite";

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

function getDb() {
  if (!db) {
    db = SQLite.openDatabaseSync("app.db");
  }
  return db;
}

export async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const database = getDb();
    await database.execAsync(`
      PRAGMA foreign_keys = ON;

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

        synced INTEGER DEFAULT 0
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

        synced INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT
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

        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS image_evaluations (
        id INTEGER PRIMARY KEY,
        evaluation_id INTEGER,
        label TEXT,
        scores TEXT,
        data BLOB,

        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS text_evaluations (
        id INTEGER PRIMARY KEY,
        evaluation_id INTEGER,
        label TEXT,
        scores TEXT,
        data TEXT,

        synced INTEGER DEFAULT 0
      );
    `);
  })();
  return initPromise;
}

export function setCurrentUserId(userId: number) {
  currentUserId = userId;
}

export function getCurrentUserId() {
  return currentUserId;
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
  ];

  for (const table of tables) {
    await executeSqlAsync(`DELETE FROM ${table};`);
  }

  // optional: reset any in-memory state
  currentUserId = TEST_USER.userId;
}
