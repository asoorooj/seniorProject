import { executeSqlAsync, getCurrentUserId, initDb } from "@/services/db";

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

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function upsertServerEntries(
  evaluations: ServerEvaluation[],
  userId: number = getCurrentUserId()
) {
  await initDb();
  const nowIso = new Date().toISOString();
  for (const entry of evaluations) {
    const evaluation = entry.evaluation ?? {};
    const serverId = evaluation.id ?? null;
    if (!serverId) continue;
    await executeSqlAsync(
      `INSERT INTO journal_entries
        (server_id, user_id, timestamp, mood, score, label, scores_json,
         face_label, face_scores_json, voice_label, voice_scores_json,
         text_label, text_scores_json, suggestion, journal_text, tip, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(server_id) DO UPDATE SET
         timestamp=excluded.timestamp,
         mood=excluded.mood,
         score=excluded.score,
         label=excluded.label,
         scores_json=excluded.scores_json,
         face_label=excluded.face_label,
         face_scores_json=excluded.face_scores_json,
         voice_label=excluded.voice_label,
         voice_scores_json=excluded.voice_scores_json,
         text_label=excluded.text_label,
         text_scores_json=excluded.text_scores_json,
         suggestion=excluded.suggestion,
         journal_text=excluded.journal_text,
         tip=excluded.tip,
         synced=1,
         updated_at=excluded.updated_at;`,
      [
        serverId,
        userId,
        evaluation.timestamp ?? nowIso,
        evaluation.label ?? "unknown",
        maxScore(evaluation.scores),
        evaluation.label ?? "unknown",
        JSON.stringify(evaluation.scores ?? {}),
        entry.image?.label ?? "unknown",
        JSON.stringify(entry.image?.scores ?? {}),
        entry.audio?.label ?? "unknown",
        JSON.stringify(entry.audio?.scores ?? {}),
        entry.text?.label ?? "unknown",
        JSON.stringify(entry.text?.scores ?? {}),
        evaluation.suggestion ?? null,
        evaluation.journal_text ?? null,
        evaluation.tip ?? null,
        nowIso,
      ]
    );
  }
}

export async function getEntriesForRange(params: {
  start: Date;
  end: Date;
  userId?: number;
}) {
  const { start, end, userId = getCurrentUserId() } = params;
  await initDb();
  const result = await executeSqlAsync(
    `SELECT * FROM journal_entries
     WHERE user_id = ? AND timestamp >= ? AND timestamp < ?
     ORDER BY datetime(timestamp) ASC;`,
    [userId, start.toISOString(), end.toISOString()]
  );
  const rows = result.rows as any;
  const items: RawEntry[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i);
    const faceScores = safeJsonParse<Record<string, number>>(row.face_scores_json);
    const voiceScores = safeJsonParse<Record<string, number>>(row.voice_scores_json);
    const textScores = safeJsonParse<Record<string, number>>(row.text_scores_json);
    items.push({
      id: String(row.server_id ?? row.local_id),
      timestamp: row.timestamp,
      mood: row.label ?? row.mood ?? "unknown",
      score: row.score ?? maxScore(safeJsonParse(row.scores_json)),
      face: {
        score: maxScore(faceScores),
        label: row.face_label ?? "unknown",
      },
      voice: {
        score: maxScore(voiceScores),
        label: row.voice_label ?? "unknown",
      },
      text: {
        score: maxScore(textScores),
        label: row.text_label ?? "unknown",
      },
      journal_text: row.journal_text ?? null,
      suggestion: row.suggestion ?? null,
      tip: row.tip ?? null,
    });
  }
  return items;
}

export async function getEntriesForMonth(
  monthStart: Date,
  userId: number = getCurrentUserId()
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
  userId: number = getCurrentUserId()
) {
  await initDb();
  await executeSqlAsync(
    `DELETE FROM journal_entries
     WHERE user_id = ? AND synced = 1 AND timestamp < ?;`,
    [userId, cutoffStart.toISOString()]
  );
}
