import { executeSqlAsync, initDb } from "@/services/db";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RawEntry {
  id: string;
  timestamp: string;
  score: number;
  mood: string;
  journal_text: string | null;
  suggestion: string | null;
  tip: string | null;
  face: { score: number; label: string };
  voice: { score: number; label: string };
  text: { score: number; label: string };
}

type ServerEvaluation = Record<string, any>;

function maxScore(scores: Record<string, unknown> | null | undefined): number {
  if (!scores) return 0;
  const entries = Object.entries(scores).filter(([k]) => k !== "_raw_label");
  if (entries.length === 0) return 0;
  const maxVal = Math.max(...entries.map(([, v]) => Number(v) || 0));
  return Math.round(maxVal * 100);
}

function safeJsonParse<T>(value: any): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

export async function upsertServerEntries(
  evaluations: ServerEvaluation[],
  userId?: number
) {
  await initDb();

  for (const entry of evaluations) {
    const evaluation = entry.evaluation ?? {};
    const evaluationId = Number(evaluation.id ?? 0);
    if (!evaluationId) continue;

    await executeSqlAsync(
      `INSERT INTO evaluations
        (id, user_id, timestamp, label, scores, suggestion, synced)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
        user_id=excluded.user_id,
        timestamp=excluded.timestamp,
        label=excluded.label,
        scores=excluded.scores,
        suggestion=excluded.suggestion,
        synced=1;`,
      [
        evaluationId,
        userId ?? await AsyncStorage.getItem("id"),
        evaluation.timestamp ?? new Date().toISOString(),
        evaluation.label ?? "unknown",
        JSON.stringify(evaluation.scores ?? {}),
        evaluation.suggestion ?? null,
      ]
    );

    if (entry.audio) {
      await executeSqlAsync(
        `INSERT INTO audio_evaluations
          (id, evaluation_id, label, scores, data, synced)
         VALUES (?, ?, ?, ?, NULL, 1)
         ON CONFLICT(evaluation_id) DO UPDATE SET
          id=excluded.id,
          label=excluded.label,
          scores=excluded.scores,
          synced=1;`,
        [
          Number(entry.audio.id ?? evaluationId),
          evaluationId,
          entry.audio.label ?? "unknown",
          JSON.stringify(entry.audio.scores ?? {}),
        ]
      );
    }

    if (entry.image) {
      await executeSqlAsync(
        `INSERT INTO image_evaluations
          (id, evaluation_id, label, scores, data, synced)
         VALUES (?, ?, ?, ?, NULL, 1)
         ON CONFLICT(evaluation_id) DO UPDATE SET
          id=excluded.id,
          label=excluded.label,
          scores=excluded.scores,
          synced=1;`,
        [
          Number(entry.image.id ?? evaluationId),
          evaluationId,
          entry.image.label ?? "unknown",
          JSON.stringify(entry.image.scores ?? {}),
        ]
      );
    }

    if (entry.text) {
      await executeSqlAsync(
        `INSERT INTO text_evaluations
          (id, evaluation_id, label, scores, data, synced)
         VALUES (?, ?, ?, ?, NULL, 1)
         ON CONFLICT(evaluation_id) DO UPDATE SET
          id=excluded.id,
          label=excluded.label,
          scores=excluded.scores,
          synced=1;`,
        [
          Number(entry.text.id ?? evaluationId),
          evaluationId,
          entry.text.label ?? "unknown",
          JSON.stringify(entry.text.scores ?? {}),
        ]
      );
    }
  }
}

export async function getEntriesForRange(params: {
  start: Date;
  end: Date;
  userId?: number;
}) {
  const { start, end, userId } = params;
  await initDb();
  const result = await executeSqlAsync(
    `SELECT
        e.id,
        e.timestamp,
        e.label,
        e.scores,
        e.suggestion,
        i.label AS image_label,
        i.scores AS image_scores,
        a.label AS audio_label,
        a.scores AS audio_scores,
        t.label AS text_label,
        t.scores AS text_scores
     FROM evaluations e
     LEFT JOIN image_evaluations i ON i.evaluation_id = e.id
     LEFT JOIN audio_evaluations a ON a.evaluation_id = e.id
     LEFT JOIN text_evaluations t ON t.evaluation_id = e.id
     WHERE e.user_id = ? AND e.timestamp >= ? AND e.timestamp < ?
     ORDER BY datetime(e.timestamp) ASC, e.id ASC;`,
    [userId ?? await AsyncStorage.getItem('id'), start.toISOString(), end.toISOString()]
  );

  const rows = result.rows as any;
  const items: RawEntry[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i);
    const evaluationScores = safeJsonParse<Record<string, number>>(row.scores);
    const faceScores = safeJsonParse<Record<string, number>>(row.image_scores);
    const voiceScores = safeJsonParse<Record<string, number>>(row.audio_scores);
    const textScores = safeJsonParse<Record<string, number>>(row.text_scores);

    items.push({
      id: String(row.id),
      timestamp: row.timestamp,
      mood: row.label ?? "unknown",
      score: maxScore(evaluationScores),
      face: {
        score: maxScore(faceScores),
        label: row.image_label ?? "unknown",
      },
      voice: {
        score: maxScore(voiceScores),
        label: row.audio_label ?? "unknown",
      },
      text: {
        score: maxScore(textScores),
        label: row.text_label ?? "unknown",
      },
      journal_text: null,
      suggestion: row.suggestion ?? null,
      tip: null,
    });
  }
  return items;
}

export async function getEntriesForMonth(
  monthStart: Date,
  userId?: number
) {
  const start = new Date(monthStart);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);
  return getEntriesForRange({ start, end, userId });
}

export async function trimToRecentWeeks(
  cutoffStart: Date,
  userId?: number
) {
  userId = userId ?? Number(await AsyncStorage.getItem("id"))
  await initDb();
  await executeSqlAsync(
    `DELETE FROM audio_evaluations
     WHERE evaluation_id IN (
       SELECT id FROM evaluations
       WHERE user_id = ? AND synced = 1 AND timestamp < ?
     );`,
    [userId, cutoffStart.toISOString()]
  );
  await executeSqlAsync(
    `DELETE FROM image_evaluations
     WHERE evaluation_id IN (
       SELECT id FROM evaluations
       WHERE user_id = ? AND synced = 1 AND timestamp < ?
     );`,
    [userId, cutoffStart.toISOString()]
  );
  await executeSqlAsync(
    `DELETE FROM text_evaluations
     WHERE evaluation_id IN (
       SELECT id FROM evaluations
       WHERE user_id = ? AND synced = 1 AND timestamp < ?
     );`,
    [userId, cutoffStart.toISOString()]
  );
  await executeSqlAsync(
    `DELETE FROM evaluations
     WHERE user_id = ? AND synced = 1 AND timestamp < ?;`,
    [userId, cutoffStart.toISOString()]
  );
}

export async function getTotalEvals(user_id?:number){
  const result = await executeSqlAsync(`
    
    SELECT COUNT(*) FROM evaluations WHERE user_id = ?
    
    `, [user_id ?? await AsyncStorage.getItem("id")]);

    return result?.rows?.item(0)?.total ?? result?.rows?.item(0);
}
