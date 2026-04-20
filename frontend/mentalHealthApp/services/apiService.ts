import { API_BASE } from "../constants/api";
import { User } from "../hooks/useAuth"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearDatabase, executeSqlAsync } from "./db";
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

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const saveUser = async (userDetails: {access_token:string, user:User}) => {
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
  ]);
};

export const getUser = async (): Promise<User | null> => {
  const keys = [
    "token",
    "id",
    "email",
    "external_id",
    "created_at",
    "consent_chat",
    "consent_image",
    "consent_audio",
    "streak",
    "eval_image",
    "eval_audio",
    "eval_text",
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
      stor_cons_text: data.consent_chat === "true",
      stor_cons_image: data.consent_image === "true",
      stor_cons_audio: data.consent_audio === "true",
    },
    streak: Number(data.streak ?? 0),
    preferences: {
      pref_eval_image: data.eval_face === "true",
      pref_eval_audio: data.eval_audio === "true",
      pref_eval_text: data.eval_text === "true",
    },
  };
};

export const registerUser = async (email: string, password: string):Promise<{message:string, user:User, access_token:string, user_id:number}> => {
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
};

// ================= CHAT =================

export async function fetchChatHistory(params: {
  jwt?: string;
  beforeId?: number;
  cursor?: string | null;
  limit?: number;
}) {
  const { beforeId, cursor, limit, jwt } = params;

  let url = `${API_BASE}/chat/history`;

  const query: string[] = [];

  if (cursor) query.push(`cursor=${encodeURIComponent(cursor)}`);
  if (beforeId) query.push(`before_id=${beforeId}`);
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
  if (!res.ok) throw { status: res.status };

  return res.json();
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

export async function fetchEvaluationsByDate(params: {
  userId?: number;
  jwt?: string;
  startDate: string;
}) {
  const { userId, startDate, jwt } = params;
  const token = await AsyncStorage.getItem("token");

  const res = await fetch(
    `${API_BASE}/evaluation/by-date?user_id=${userId ? userId : await AsyncStorage.getItem("id")}&start_date=${startDate}`,
    {
      headers: {
        "Authorization": `Bearer ${jwt ? jwt : token}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!res.ok) throw { status: res.status };

  return res.json();
}

export async function fetchEvaluationsByMonth(params: {
  userId?: number;
  jwt: string;
  startDate: string;
}) {
  const { userId, startDate, jwt } = params;
  // const token = await AsyncStorage.getItem("token");

  const res = await fetch(
    `${API_BASE}/evaluation/by-month?user_id=${userId ? userId : await AsyncStorage.getItem("id")}&start_date=${startDate}`,
    {
      headers: {
        "Authorization": `Bearer ${jwt}`,
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

  console.log("HERE",await res.json());

  return await res.json();
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

  console.log(evaluationId)

  // 2. Append additional data

  const token = await AsyncStorage.getItem('token');
  
  const res = await fetch(`${API_BASE}/startevaluation_audio`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
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