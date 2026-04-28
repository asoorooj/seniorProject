
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_STATUS_KEY = "needs_onboarding";

export const getAuthToken = async () => {
  return await AsyncStorage.getItem("token");
  
};

export const isAuthenticated = async () => {
  const token = await getAuthToken();
  return !!token;
};

export const setNeedsOnboarding = async (needsOnboarding: boolean) => {
  await AsyncStorage.setItem(ONBOARDING_STATUS_KEY, needsOnboarding ? "true" : "false");
};

export const getNeedsOnboarding = async () => {
  return (await AsyncStorage.getItem(ONBOARDING_STATUS_KEY)) === "true";
};
