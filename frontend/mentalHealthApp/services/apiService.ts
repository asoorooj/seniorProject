import { API_BASE } from "@/constants/api";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchChatHistory(params: {
  userId: number;
  beforeId?: number;
}) {
  const { userId, beforeId } = params;
  const url = beforeId
    ? `${API_BASE}/chat/history?user_id=${userId}&before_id=${beforeId}`
    : `${API_BASE}/chat/history?user_id=${userId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    console.error(await safeJson(res));
    return null;
  }
  return res.json();
}

export async function sendChatMessage(params: {
  userId: number;
  message: unknown;
}) {
  const { userId, message } = params;
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      message,
    }),
  });
  if (!res.ok) {
    console.error(await safeJson(res));
    return null;
  }
  return res.json();
}

export async function fetchEvaluationsByDate(params: {
  userId: number;
  startDate: string;
}) {
  const { userId, startDate } = params;
  const res = await fetch(
    `${API_BASE}/evaluation/by-date?user_id=${userId}&start_date=${startDate}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  return res.json();
}

export async function fetchProfile() {
  const res = await fetch(`${API_BASE}/api/profile`);
  if (!res.ok) throw new Error("Profile request failed");
  return res.json();
}

export async function fetchWeeklyScores() {
  const res = await fetch(`${API_BASE}/api/scores/week`);
  if (!res.ok) throw new Error("Scores request failed");
  return res.json();
}

export async function fetchEmotionalProfile() {
  const res = await fetch(`${API_BASE}/api/emotional-profile`);
  if (!res.ok) throw new Error("Emotional profile request failed");
  return res.json();
}

export async function logout() {
  return fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
}

export async function startEvaluation(userId: number) {
  const res = await fetch(`${API_BASE}/startevaluation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function endEvaluation(evaluationId: number) {
  const res = await fetch(`${API_BASE}/endevaluation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evaluationId }),
  });
  return res.json();
}

export async function analyzeFaceImage(base64: string, evaluationId: number) {
  try {
    const res = await fetch(`${API_BASE}/startevaluation_face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, evaluationId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(data);
    return {
      emotion: data.image_label ?? "Unknown",
      confidence:
        typeof data.image_scores?.[data.image_label] === "number"
          ? data.image_scores[data.image_label]
          : 0,
    };
  } catch (err) {
    console.warn("Face analysis API not available, using placeholder:", err);
    return { emotion: "Happy", confidence: 0.87 };
  }
}

export async function analyzeAudioClip(uri: string, evaluationId: number) {
  try {
    const formData = new FormData();
    formData.append("audio", {
      uri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as any);
    formData.append("evaluationId", String(evaluationId));

    const res = await fetch(`${API_BASE}/startevaluation_audio`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Audio analysis:", data);
    return {
      emotion: data.audio_label ?? "Unknown",
      confidence:
        typeof data.audio_scores?.[data.audio_label] === "number"
          ? data.audio_scores[data.audio_label]
          : 0,
    };
  } catch (err) {
    console.warn("Audio analysis API not available, using placeholder:", err);
    return { emotion: "Neutral", confidence: 0.72 };
  }
}

export async function analyzeTextEntry(text: string, evaluationId: number) {
  try {
    const res = await fetch(`${API_BASE}/startevaluation_text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, evaluationId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Text analysis:", data);
    return {
      label: data.text_label ?? "Unknown",
      scores: data.text_scores ?? {},
    };
  } catch (err) {
    console.warn("Text analysis API not available, using placeholder:", err);
    return {
      label: "Happy",
      scores: { Happy: 0.68, Sad: 0.2, Fear: 0.12 },
    };
  }
}
