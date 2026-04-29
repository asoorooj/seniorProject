import { API_BASE } from "../constants/api";
import { User } from "../hooks/useAuth"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearDatabase } from "./db";
import { getEntriesForRange, RawEntry, trimToRecentWeeks, upsertServerEntries } from "./repositories/journalRepository";
export type UserPreferences = {
  pref_eval_text: boolean;
  pref_eval_image: boolean;
  pref_eval_audio: boolean;
};
export type UserConsent = {
  stor_cons_text: boolean;
  stor_cons_image: boolean;
  stor_cons_audio: boolean;
};

export type UserInterests = {
  likes: string[];
  dislikes: string[];
};
export type Evaluation = {
  evaluation: {
    id: number;
    user_id: number;
    timestamp: Date;
    scores: string;
    label:string;
    suggestion:string;
    audio:{
      id:number;
      evaluation_id:number;
      scores:string;
      label:string;
    },
    image:{
      id:number;
      evaluation_id:number;
      scores:string;
      label:string;
    },
    text:{
      id:number;
      evaluation_id:number;
      scores:string;
      label:string;
    }
  }
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function safeParseJsonArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value !== "string") return [];
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v));
  } catch {
    return [];
  }
}

export const saveUser = async (userDetails: {access_token:string, user:User}) => {
  const likes = Array.isArray(userDetails.user.likes) ? userDetails.user.likes : [];
  const dislikes = Array.isArray(userDetails.user.dislikes) ? userDetails.user.dislikes : [];
  await AsyncStorage.multiSet([
    ["token", userDetails.access_token ?? ""],
    ["email", String(userDetails.user.email ?? "")],
    ["id", String(userDetails.user.id ?? "")],
    ["external_id", userDetails.user.external_id ?? ""],
    ["created_at", userDetails.user.created_at ?? ""],
    ["consent_text", String(userDetails.user.storage_consent.stor_cons_text ?? "")],
    ["consent_image", String(userDetails.user.storage_consent.stor_cons_image ?? "")],
    ["consent_audio", String(userDetails.user.storage_consent.stor_cons_audio ?? "")],
    ["streak", String(userDetails.user.streak ?? "")],
    ["eval_image", String(userDetails.user.preferences.pref_eval_image ?? "")],
    ["eval_audio", String(userDetails.user.preferences.pref_eval_audio ?? "")],
    ["eval_text", String(userDetails.user.preferences.pref_eval_text ?? "")],
    ["likes", JSON.stringify(likes)],
    ["dislikes", JSON.stringify(dislikes)],
  ]);
};

export const getUser = async (): Promise<User | null> => {
  const keys = [
    "token",
    "id",
    "email",
    "external_id",
    "created_at",
    "consent_chat", // legacy
    "consent_text",
    "consent_image",
    "consent_audio",
    "streak",
    "eval_face", // legacy
    "eval_image",
    "eval_audio",
    "eval_text",
    "likes",
    "dislikes",
  ];

  const entries = await AsyncStorage.multiGet(keys);

  const data = Object.fromEntries(entries);

  if (!data.id) return null;

  return {
    token: data.token ?? undefined,
    id: Number(data.id),
    email: data.email ?? "",
    external_id: data.external_id ?? "",
    created_at: data.created_at ?? "",
    storage_consent: {
      stor_cons_text: (data.consent_text ?? data.consent_chat) === "true",
      stor_cons_image: data.consent_image === "true",
      stor_cons_audio: data.consent_audio === "true",
    },
    streak: Number(data.streak ?? 0),
    preferences: {
      pref_eval_image: (data.eval_image ?? data.eval_face) === "true",
      pref_eval_audio: data.eval_audio === "true",
      pref_eval_text: data.eval_text === "true",
    },
    likes: safeParseJsonArray(data.likes),
    dislikes: safeParseJsonArray(data.dislikes),
  };
};

export const registerUser = async (email: string, password: string):Promise<{message:string, user:User, access_token:string, user_id:number, error?: string}> => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if(!res.ok) throw new Error(`failed to register ${JSON.stringify(res)}`);

  return res.json();
};

export const loginUser = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return res.json();
};

export const logout = async (jwt?:string) => { //temp method
  // const res = await fetch(`${API_BASE}/auth/login`, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ email, password }),
  // });

  // return res.json();
  AsyncStorage.multiRemove([
    "token",
    "email",
    "id",
    "external_id",
    "created_at",
    "consent_text",
    "consent_image",
    "consent_audio",
    "streak",
    "eval_image",
    "eval_audio",
    "eval_text",
    "likes",
    "dislikes",
  ]);
  clearDatabase();
};

export const syncUser = async (user:User) => {
  try{
    if(String(user.id) === await AsyncStorage.getItem("id")){
      await AsyncStorage.multiSet([
        ["email", String(user.email ?? "")],      
        ["external_id", user.external_id ?? ""],            
        ["streak", String(user.streak ?? "")],    
        ["consent_text", String(user.storage_consent.stor_cons_text ?? "")],
        ["consent_image", String(user.storage_consent.stor_cons_image ?? "")],
        ["consent_audio", String(user.storage_consent.stor_cons_audio ?? "")],
        ["streak", String(user.streak ?? "")],
        ["eval_image", String(user.preferences.pref_eval_image ?? "")],
        ["eval_audio", String(user.preferences.pref_eval_audio ?? "")],
        ["eval_text", String(user.preferences.pref_eval_text ?? "")],
        ["likes", JSON.stringify(Array.isArray(user.likes) ? user.likes : [])],
        ["dislikes", JSON.stringify(Array.isArray(user.dislikes) ? user.dislikes : [])],
      ]);
    }
  } catch (error){
    console.error("[cache] Failed to store data", error);
  }
  try{
    const entries = Object.fromEntries(await AsyncStorage.multiGet(["eval_image",
      "eval_audio",
      "eval_text",]));
    await updateUserPreferences({
      pref_eval_audio: entries.eval_audio === "true",
      pref_eval_text: entries.eval_text === "true",
      pref_eval_image: entries.eval_image === "true"
    });
  } catch (error){
    console.error("[api] Failed to sync preferences", error);
  }
    try{
    const entries = Object.fromEntries(await AsyncStorage.multiGet(["consent_image",
      "consent_audio",
      "consent_text",]));
    await updateUserConsent({
      stor_cons_audio: entries.consent_audio === "true",
      stor_cons_text: entries.consent_text === "true",
      stor_cons_image: entries.consent_image === "true"
    });
  } catch (error){
    console.error("[api] Failed to sync storage consent", error);
  }
  try{
    const entries = Object.fromEntries(await AsyncStorage.multiGet(["likes","dislikes"]));
    await updateUserInterests({
      likes: safeParseJsonArray(entries.likes),
      dislikes: safeParseJsonArray(entries.dislikes),
    });
  } catch (error){
    console.error("[api] Failed to sync interests", error);
  }
};

// ================= CHAT =================

export async function fetchChatHistory(params: {
  jwt?: string;
  beforeTs?: string;
  beforeId?: number;
  limit?: number;
}) {
  const { beforeTs, beforeId, limit, jwt } = params;

  let url = `${API_BASE}/chat/history`;

  const query: string[] = [];

  if (beforeTs) query.push(`before_ts=${encodeURIComponent(beforeTs)}`);
  if (typeof beforeId === "number") query.push(`before_id=${beforeId}`);
  if (limit) query.push(`limit=${limit}`);

  if (query.length > 0) {
    url += `?${query.join("&")}`;
  }
  const headers = {
    "Authorization": `Bearer ${jwt ?? await AsyncStorage.getItem("token")}`,
    "Content-Type": "application/json"
  };

  console.log("[api] FINAL URL:", url); // 🔥 debug

  const res = await fetch(url, { headers });
  const data = await safeJson(res);
  if (!res.ok) {
    throw {
      status: res.status,
      message: data?.error ?? "failed to fetch chat history",
    };
  }

  return {
    messages: data?.messages ?? [],
    has_more: Boolean(data?.has_more),
    next_before_id:
      typeof data?.next_before_id === "number" ? data.next_before_id : null,
    next_before_ts:
      typeof data?.next_before_ts === "string" ? data.next_before_ts : null,
  };
}



export async function sendChatMessage(params: {
  jwt?: string;
  message: string;
}) {
  const { jwt, message } = params;

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt ?? await AsyncStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        textMessage: message,
      },
    }),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

// ================= JOURNAL =================

export async function fetchJournalsByDate(params: {
  userId?: number;
  start: Date;
  end: Date;
  jwt?: string;
}) {
  const { userId, start, end, jwt } = params;

  const headers = {
    Authorization: `Bearer ${jwt ?? await AsyncStorage.getItem("token")}`,
    "Content-Type": "application/json",
  };

  const url = `${API_BASE}/evaluation/by-date?user_id=${
    userId ?? await AsyncStorage.getItem("id")
  }&start_date=${formatDate(start)}`;

  let entries: RawEntry[] = [];

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    // ✅ save server data
    await upsertServerEntries(data?.evaluations ?? [], userId);

    // ✅ prune older than 8 weeks
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7 * 8);

    await trimToRecentWeeks(cutoff, Number(userId ?? await AsyncStorage.getItem("id")));

    // ✅ read from DB using your function
    entries = await getEntriesForRange({ start, end, userId });

  } catch (err) {
    console.log("[journal] API failed, fallback to DB");

    try {
      entries = await getEntriesForRange({ start, end, userId });
    } catch {
      return [];
    }
  }

  return entries;
}

function formatDate(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

export async function fetchEvaluationsByMonth(params: {
  userId?: number;
  jwt: string;
  month: number; // 0-11
}) {
  const { userId, month, jwt } = params;

  const storedId = await AsyncStorage.getItem("id");

  const finalUserId = userId ?? (storedId ? Number(storedId) : null);
  if (!finalUserId) throw new Error("Missing userId");

  const res = await fetch(
      `${API_BASE}/evaluation/by-month?user_id=${finalUserId}&month=${month}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      }
  );

  const data = await safeJson(res);

  if (!res.ok) {
    throw {
      status: res.status,
      data,
    };
  }

  return data;
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
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
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
  preferences: UserPreferences,
  userId?: number
) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/users/preferences`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

export async function updateUserConsent(
  consent: UserConsent,
  userId?: number
) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/users/consent`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify(consent),
  });

  if (!res.ok) throw { status: res.status };

  return res.json();
}

export async function updateUserInterests(interests: Partial<UserInterests>) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/users/interests`, {
    method: "PUT",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" },
    body: JSON.stringify(interests),
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

export async function cancelEvaluation(evaluationId: number) {
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/evaluation/${evaluationId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"}
  });

  if (!res.ok) throw { status: res.status };

  const data = await res.json();

  console.log(data)

  return await data;
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
  
  // 1. Ensure 'audio' matches the field name expected by your backend
  formData.append('evaluationId', String(evaluationId));
  formData.append('audio', {
    uri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);

  console.log("Uploading URI:", uri);
  console.log("Evaluation ID:", evaluationId);

  // 2. Append additional data

  const token = await AsyncStorage.getItem('token');

  const res = await fetch(`${API_BASE}/startevaluation_audio`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();

    console.error("❌ BACKEND ERROR STATUS:", res.status);
    console.error("❌ BACKEND ERROR BODY:", text);

    throw new Error(text); // 👈 keep real message
  }

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

export async function fetchUserProfile():Promise<{user:User,journal_count:number}>{
  const token = await AsyncStorage.getItem("token");
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "GET",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json" 
    },
  });

  if (!res.ok) throw { status: res.status };
  console.log("[profile] fetch user profile success", res.json);
  return res.json();
}
