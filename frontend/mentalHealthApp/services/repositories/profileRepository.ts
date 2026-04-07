import { executeSqlAsync, getCurrentUserId, initDb } from "@/services/db";

async function setCache(
  table: "profile_cache" | "scores_cache" | "emotions_cache",
  column: string,
  value: unknown,
  userId: number
) {
  await initDb();
  const nowIso = new Date().toISOString();
  await executeSqlAsync(
    `INSERT INTO ${table} (user_id, ${column}, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
      ${column}=excluded.${column},
      updated_at=excluded.updated_at;`,
    [userId, JSON.stringify(value ?? {}), nowIso]
  );
}

async function getCache<T>(
  table: "profile_cache" | "scores_cache" | "emotions_cache",
  column: string,
  userId: number
) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT ${column} FROM ${table} WHERE user_id = ?;`,
    [userId]
  );
  const row = (result.rows as any).item(0);
  if (!row || !row[column]) return null;
  try {
    return JSON.parse(row[column]) as T;
  } catch {
    return null;
  }
}

export async function setProfileCache(profile: unknown, userId = getCurrentUserId()) {
  return setCache("profile_cache", "profile_json", profile, userId);
}

export async function getProfileCache<T = unknown>(userId = getCurrentUserId()) {
  return getCache<T>("profile_cache", "profile_json", userId);
}

export async function setScoresCache(scores: unknown, userId = getCurrentUserId()) {
  return setCache("scores_cache", "week_scores_json", scores, userId);
}

export async function getScoresCache<T = unknown>(userId = getCurrentUserId()) {
  return getCache<T>("scores_cache", "week_scores_json", userId);
}

export async function setEmotionsCache(emotions: unknown, userId = getCurrentUserId()) {
  return setCache("emotions_cache", "emotions_json", emotions, userId);
}

export async function getEmotionsCache<T = unknown>(userId = getCurrentUserId()) {
  return getCache<T>("emotions_cache", "emotions_json", userId);
}
