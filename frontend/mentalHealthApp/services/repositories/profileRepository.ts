import { executeSqlAsync, getCurrentUserId, initDb } from "@/services/db";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function monthYear(iso: string | null | undefined) {
  if (!iso) return "Member";
  const d = new Date(iso);
  return `Member since ${d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
}

function scoreFromScoresJson(scoresRaw: any): number {
  if (!scoresRaw) return 0;
  let scores: Record<string, unknown> | null = null;
  if (typeof scoresRaw === "object") {
    scores = scoresRaw as Record<string, unknown>;
  } else {
    try {
      scores = JSON.parse(String(scoresRaw));
    } catch {
      scores = null;
    }
  }
  if (!scores) return 0;
  const values = Object.entries(scores)
    .filter(([k]) => k !== "_raw_label")
    .map(([, v]) => Number(v) || 0);
  if (values.length === 0) return 0;
  return Math.round(Math.max(...values) * 100);
}

function variantForIndex(index: number): "green" | "coral" | "outline" {
  if (index === 0) return "green";
  if (index === 1) return "coral";
  return "outline";
}

async function getUserRow(userId: number) {
  await initDb();
  const result = await executeSqlAsync(`SELECT * FROM users WHERE id = ? LIMIT 1;`, [
    userId,
  ]);
  return (result.rows as any).item(0) ?? null;
}

export async function setProfileCache(_profile: unknown, _userId = getCurrentUserId()) {
  // No-op by design: profile is derived from normalized backend-like tables.
  return null;
}

export async function getProfileCache<T = unknown>(userId = getCurrentUserId()) {
  await initDb();
  const user = await getUserRow(userId);
  if (!user) return null;

  const countsResult = await executeSqlAsync(
    `SELECT
        COUNT(*) AS scans,
        COUNT(*) AS journals
     FROM evaluations
     WHERE user_id = ?;`,
    [userId]
  );
  const counts = (countsResult.rows as any).item(0) ?? { scans: 0, journals: 0 };

  const streakRows = await executeSqlAsync(
    `SELECT DISTINCT DATE(timestamp) AS day
     FROM evaluations
     WHERE user_id = ?
     ORDER BY day DESC;`,
    [userId]
  );
  let streak = 0;
  const now = new Date();
  let expected = new Date(now);
  expected.setHours(0, 0, 0, 0);
  for (let i = 0; i < (streakRows.rows as any).length; i += 1) {
    const day = new Date((streakRows.rows as any).item(i).day);
    day.setHours(0, 0, 0, 0);
    if (day.getTime() === expected.getTime()) {
      streak += 1;
      expected.setDate(expected.getDate() - 1);
      continue;
    }
    // Allow streak to start from yesterday if today has no entry.
    if (streak === 0) {
      const yesterday = new Date(now);
      yesterday.setHours(0, 0, 0, 0);
      yesterday.setDate(yesterday.getDate() - 1);
      if (day.getTime() === yesterday.getTime()) {
        streak = 1;
        expected = new Date(yesterday);
        expected.setDate(expected.getDate() - 1);
        continue;
      }
    }
    break;
  }

  const profile = {
    name: (user.email ?? "User").split("@")[0],
    memberSince: monthYear(user.created_at),
    scans: Number(counts.scans ?? 0),
    journals: Number(counts.journals ?? 0),
    streak,
  };
  return profile as T;
}

export async function setScoresCache(_scores: unknown, _userId = getCurrentUserId()) {
  // No-op by design.
  return null;
}

export async function getScoresCache<T = unknown>(userId = getCurrentUserId()) {
  await initDb();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const result = await executeSqlAsync(
    `SELECT timestamp, scores
     FROM evaluations
     WHERE user_id = ? AND timestamp >= ? AND timestamp < ?;`,
    [userId, weekStart.toISOString(), weekEnd.toISOString()]
  );

  const byDay: Record<number, number[]> = {};
  for (let i = 0; i < (result.rows as any).length; i += 1) {
    const row = (result.rows as any).item(i);
    const day = new Date(row.timestamp).getDay();
    byDay[day] = byDay[day] ?? [];
    byDay[day].push(scoreFromScoresJson(row.scores));
  }

  const scores = DAYS.map((day, index) => {
    const values = byDay[index] ?? [];
    const avg =
      values.length === 0
        ? 0
        : Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    return {
      day,
      score: avg,
      isToday: index === today.getDay(),
    };
  });

  return scores as T;
}

export async function setEmotionsCache(_emotions: unknown, _userId = getCurrentUserId()) {
  // No-op by design.
  return null;
}

export async function getEmotionsCache<T = unknown>(userId = getCurrentUserId()) {
  await initDb();
  const result = await executeSqlAsync(
    `SELECT label, COUNT(*) AS total
     FROM evaluations
     WHERE user_id = ? AND label IS NOT NULL
     GROUP BY label
     ORDER BY total DESC
     LIMIT 4;`,
    [userId]
  );

  const emotions: Array<{ label: string; variant: "green" | "coral" | "outline" }> = [];
  for (let i = 0; i < (result.rows as any).length; i += 1) {
    const row = (result.rows as any).item(i);
    emotions.push({
      label: String(row.label),
      variant: variantForIndex(i),
    });
  }
  return emotions as T;
}
