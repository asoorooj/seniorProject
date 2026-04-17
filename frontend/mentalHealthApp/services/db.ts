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
let currentUserId = 1;

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

      CREATE TABLE IF NOT EXISTS messages (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        user_id INTEGER NOT NULL,
        session_id INTEGER,
        is_user INTEGER NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT,
        emotion_label TEXT,
        synced INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_messages_user_time ON messages (user_id, timestamp);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_server_id ON messages (server_id);

      CREATE TABLE IF NOT EXISTS journal_entries (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        user_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        mood TEXT,
        score INTEGER,
        label TEXT,
        scores_json TEXT,
        face_label TEXT,
        face_scores_json TEXT,
        voice_label TEXT,
        voice_scores_json TEXT,
        text_label TEXT,
        text_scores_json TEXT,
        suggestion TEXT,
        journal_text TEXT,
        tip TEXT,
        synced INTEGER DEFAULT 1,
        updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_journal_user_time ON journal_entries (user_id, timestamp);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_server_id ON journal_entries (server_id);

      CREATE TABLE IF NOT EXISTS profile_cache (
        user_id INTEGER PRIMARY KEY,
        profile_json TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS scores_cache (
        user_id INTEGER PRIMARY KEY,
        week_scores_json TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS emotions_cache (
        user_id INTEGER PRIMARY KEY,
        emotions_json TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_state (
        user_id INTEGER PRIMARY KEY,
        last_sync_at TEXT,
        messages_cursor TEXT,
        journal_cursor TEXT
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
    "messages",
    "journal_entries",
    "profile_cache",
    "scores_cache",
    "emotions_cache",
    "sync_state",
    "outbox",
  ];
  for (const table of tables) {
    await executeSqlAsync(`DELETE FROM ${table};`);
  }
}
