import { API_BASE } from "../constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// ================= CHAT =================

export async function fetchChatHistory(params: {
  userId: number;
  beforeId?: number;
  cursor?: string | null;
  limit?: number;
}) {
  const { beforeId, cursor, limit } = params;

  let url = `${API_BASE}/chat/history`;

  const query: string[] = [];

  if (cursor) query.push(`cursor=${encodeURIComponent(cursor)}`);
  if (beforeId) query.push(`before_id=${beforeId}`);
  if (limit) query.push(`limit=${limit}`);

  if (query.length > 0) {
    url += `?${query.join("&")}`;
  }
  const headers = {
    "Authorization": `Bearer ${await AsyncStorage.getItem("token")}`,
    "Content-Type": "application/json"
  };

  console.log("[api] FINAL URL:", url); // 🔥 debug

  const res = await fetch(url, { headers });
  if (!res.ok) throw { status: res.status };

  return res.json();
}

export async function sendChatMessage(params: {
  userId: number;
  message: unknown;
}) {
  const { userId, message } = params;
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message }),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

// ================= JOURNAL =================

export async function fetchEvaluationsByDate(params: {
  userId: number;
  startDate: string;
}) {
  const { userId, startDate } = params;
  const token = await AsyncStorage.getItem("token");

  const res = await fetch(
    `${API_BASE}/evaluation/by-date?user_id=${userId}&start_date=${startDate}`,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!res.ok) throw { status: res.status };

  return res.json();
}

// ================= PROFILE =================

export async function fetchProfile() {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw { status: res.status };
  return res.json();
}

export async function fetchWeeklyScores() {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/scores/week`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw { status: res.status };
  return res.json();
}

export async function fetchEmotionalProfile() {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/emotional-profile`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw { status: res.status };
  return res.json();
}

// ================= USER =================

export async function fetchCurrentUser() {
  const token = await AsyncStorage.getItem("token");
  const userId = await AsyncStorage.getItem("user_id");
  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,  // Include the token in the Authorization header
      "Content-Type": "application/json",
    },
  });
    if (!res.ok) throw { status: res.status };
    const data = await res.json();
    return data.user;  // Returning only the user data
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;  // Re-throw the error to handle it later
  }
}

export async function updateUserPreferences(
  userId: number,
  preferences: Partial<UserPreferences>
) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/users/${userId}/preferences`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

// ================= EVALUATION =================

export async function startEvaluation(userId: number) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/startevaluation`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

export async function endEvaluation(evaluationId: number) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/endevaluation`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"},
    body: JSON.stringify({ evaluationId }),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

// ================= MEDIA =================

export async function analyzeFaceImage(base64: string, evaluationId: number) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/startevaluation_face`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64, evaluationId }),
  });

  if (!res.ok) throw { status: res.status };

  const data = await res.json();

  return {
    emotion: data.image_label ?? "Unknown",
    confidence: data.image_scores?.[data.image_label] ?? 0,
  };
}

export async function analyzeAudioClip(uri: string, evaluationId: number) {
  const formData = new FormData();

  formData.append("audio", {
    uri,
    type: "audio/m4a",
    name: "recording.m4a",
  } as any);

  formData.append("evaluationId", String(evaluationId));
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/startevaluation_audio`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: formData,
  });

  if (!res.ok) throw { status: res.status };

  const data = await res.json();

  return {
    emotion: data.audio_label ?? "Unknown",
    confidence: data.audio_scores?.[data.audio_label] ?? 0,
  };
}

export async function analyzeTextEntry(text: string, evaluationId: number) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/startevaluation_text`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify({ text, evaluationId }),
  });

  if (!res.ok) throw { status: res.status };

  const data = await res.json();

  return {
    label: data.text_label ?? "Unknown",
    scores: data.text_scores ?? {},
  };
}

// ================= CONSENT =================

export async function fetchConsent() {
  const res = await fetch(`${API_BASE}/users/consent`);
  if (!res.ok) throw { status: res.status };
  return res.json();
}

export async function updateConsent(consent: any) {
  const res = await fetch(`${API_BASE}/users/consent`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(consent),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

// ================= AUTH =================

export async function registerUser(payload: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await safeJson(res);

  if (!res.ok) throw new Error(data?.message || "Registration failed");

  return data;
}