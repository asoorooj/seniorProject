
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getAuthToken = async () => {
  return await AsyncStorage.getItem("token");
  
};

export const isAuthenticated = async () => {
  const token = await getAuthToken();
  return !!token;
};