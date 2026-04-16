import { API_BASE } from "@/constants/api";
import { User } from "@/hooks/useAuth";

export type UserPreferences = {
  eval_face: boolean;
  eval_audio: boolean;
  eval_text: boolean;
};

export type CurrentUser = {
  id: number;
  external_id: string;
  created_at: string;
  consent?: {
    consent_chat: boolean;
    consent_image: boolean;
    consent_audio: boolean;
  };
  preferences?: UserPreferences;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function authJsonHeaders(sessionId: number) {
  return {
    "Content-Type": "application/json",
    Authorization: String(sessionId),
  };
}

export async function fetchChatHistory(params: {
  sessionId: number;
  beforeId?: number;
  cursor?: string | null;
  limit?: number;
}) {
  const { sessionId, beforeId, cursor, limit } = params;
  console.log("[api] fetchChatHistory:start", { beforeId, cursor, limit });
  let url = `${API_BASE}/chat/history`;
  if (cursor) {
    url = `${url}?cursor=${encodeURIComponent(cursor)}`;
  } else if (beforeId) {
    url = `${url}?before_id=${beforeId}`;
  }
  if (limit) {
    url = `${url}${url.includes("?") ? "&" : "?"}limit=${limit}`;
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: authJsonHeaders(sessionId),
    });
    if (!res.ok) {
      console.error(await safeJson(res));
      console.warn("[api] fetchChatHistory:failed", { status: res.status });
      return null;
    }
    console.log("[api] fetchChatHistory:success");
    return res.json();
  } catch (err) {
    console.warn("[api] fetchChatHistory:error", { err });
    return null;
  }
}

export async function sendChatMessage(params: {
  sessionId: number;
  message: unknown;
}) {
  const { sessionId, message } = params;
  console.log("[api] sendChatMessage:start");
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: authJsonHeaders(sessionId),
    body: JSON.stringify({
      message,
    }),
  });
  if (!res.ok) {
    console.error(await safeJson(res));
    console.warn("[api] sendChatMessage:failed", { status: res.status });
    return null;
  }
  console.log("[api] sendChatMessage:success");
  return res.json();
}

export async function fetchEvaluationsByDate(params: {
  sessionId: number;
  startDate: string;
}) {
  const { sessionId, startDate } = params;
  console.log("[api] fetchEvaluationsByDate:start", { startDate });
  const res = await fetch(
    `${API_BASE}/evaluation/by-date?start_date=${startDate}`,
    {
      method: "GET",
      headers: authJsonHeaders(sessionId),
    }
  );
  if (!res.ok) {
    console.warn("[api] fetchEvaluationsByDate:failed", { status: res.status });
    return null;
  } else {
    console.log("[api] fetchEvaluationsByDate:success");
  }
  return res.json();
}

export async function fetchProfile(sessionId: number) {
  console.log("[api] fetchProfile:start");
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: authJsonHeaders(sessionId),
  });
  if (!res.ok) throw new Error("Profile request failed");
  console.log("[api] fetchProfile:success");
  return res.json();
}

export async function fetchWeeklyScores(sessionId: number) {
  console.log("[api] fetchWeeklyScores:start");
  const res = await fetch(`${API_BASE}/api/scores/week`, {
    headers: authJsonHeaders(sessionId),
  });
  if (!res.ok) throw new Error("Scores request failed");
  console.log("[api] fetchWeeklyScores:success");
  return res.json();
}

export async function fetchEmotionalProfile(sessionId: number) {
  console.log("[api] fetchEmotionalProfile:start");
  const res = await fetch(`${API_BASE}/api/emotional-profile`, {
    headers: authJsonHeaders(sessionId),
  });
  if (!res.ok) throw new Error("Emotional profile request failed");
  console.log("[api] fetchEmotionalProfile:success");
  return res.json();
}

export async function logout(sessionId: number) {
  console.log("[api] logout:start");
  return fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: authJsonHeaders(sessionId),
  });
}

export async function fetchCurrentUser(userId: number, sessionId: number) {
  console.log("[api] fetchCurrentUser:start", { userId });
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "GET",
    headers: authJsonHeaders(sessionId),
  });
  if (!res.ok) {
    console.warn("[api] fetchCurrentUser:failed", { status: res.status });
    return null;
  }
  console.log("[api] fetchCurrentUser:success");
  return res.json() as Promise<{ user: CurrentUser }>;
}

export async function updateUserPreferences(
  sessionId: number,
  userId: number,
  preferences: Partial<UserPreferences>
) {
  console.log("[api] updateUserPreferences:start", { userId, preferences });
  const res = await fetch(`${API_BASE}/users/${userId}/preferences`, {
    method: "PUT",
    headers: authJsonHeaders(sessionId),
    body: JSON.stringify(preferences),
  });
  if (!res.ok) {
    console.warn("[api] updateUserPreferences:failed", { status: res.status });
    return null;
  }
  console.log("[api] updateUserPreferences:success");
  return res.json() as Promise<{ preferences: UserPreferences }>;
}

export async function startEvaluation(sessionId: number) {
  console.log("[api] startEvaluation:start");
  const res = await fetch(`${API_BASE}/startevaluation`, {
    method: "POST",
    headers: authJsonHeaders(sessionId),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    console.warn("[api] startEvaluation:failed", { status: res.status });
  } else {
    console.log("[api] startEvaluation:success");
  }
  return res.json();
}

export async function endEvaluation(evaluationId: number, sessionId: number) {
  console.log("[api] endEvaluation:start", { evaluationId });
  const res = await fetch(`${API_BASE}/endevaluation`, {
    method: "POST",
    headers: authJsonHeaders(sessionId),
    body: JSON.stringify({ evaluationId }),
  });
  if (!res.ok) {
    console.warn("[api] endEvaluation:failed", { status: res.status });
  } else {
    console.log("[api] endEvaluation:success");
  }
  return res.json();
}

export async function analyzeFaceImage(base64: string, evaluationId: number, sessionId: number) {
  try {
    const res = await fetch(`${API_BASE}/startevaluation_face`, {
      method: "POST",
      headers: authJsonHeaders(sessionId),
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

export async function analyzeAudioClip(uri: string, evaluationId: number, sessionId: number) {
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
      headers: { Authorization: String(sessionId) },
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

export async function analyzeTextEntry(text: string, evaluationId: number, sessionId: number) {
  try {
    const res = await fetch(`${API_BASE}/startevaluation_text`, {
      method: "POST",
      headers: authJsonHeaders(sessionId),
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

export async function cancelEvaluation(evaluationId: number, sessionId: number) {
  console.log("[api] cancelEvaluation:start", { evaluationId });
  const res = await fetch(`${API_BASE}/evaluation/${evaluationId}`, {
    method: "DELETE",
    headers: authJsonHeaders(sessionId),
  });
  if (!res.ok) {
    console.warn("[api] cancelEvaluation:failed", { status: res.status });
    return null;
  }
  console.log("[api] cancelEvaluation:success");
  return res.json();
}

// TODO (auth team): persist token after registration using saveAuth from services/auth
export async function registerUser(payload: { email: string; password: string; name?: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message ?? 'Registration failed');
  return data as { token: string; user: { id: number; email: string } };
}

export async function fetchConsent() {
  const res = await fetch(`${API_BASE}/users/consent`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to fetch consent');
  return res.json() as Promise<{ consent: { consent_image: boolean; consent_audio: boolean; consent_chat: boolean } }>;
}

export async function updateConsent(consent: { consent_image: boolean; consent_audio: boolean; consent_chat: boolean }) {
  const res = await fetch(`${API_BASE}/users/consent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(consent),
  });
  if (!res.ok) throw new Error('Failed to update consent');
  return res.json();
}

export async function login(email:string, password:string):Promise<{message:string; sessionId:number;user:User}>{
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
  return data;
};

// export const getProfile = async () => {
//   const session_id = TEST_USER.userId;

//   if (!session_id) {
//     throw new Error("No session found. User not logged in.");
//   }

//   const res = await fetch(`${API_BASE}/profile`, {
//     method: "GET",
//     headers: {
//       Authorization: session_id,
//     },
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     throw new Error(data.error || "Failed to fetch profile");
//   }

//   return data;
// };
