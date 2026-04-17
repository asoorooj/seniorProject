// services/apiClient.ts
import { getAuthToken } from "@/services/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const authFetch = async (url: string, options: any = {}) => {
  const token = await AsyncStorage.getItem("token");

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    throw { status: 401, message: "Unauthorized" };
  }

  return res.json();
};