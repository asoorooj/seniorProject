import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SyncProvider } from '@/services/sync/SyncProvider';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from 'react';


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const t = await AsyncStorage.getItem("token");
      setToken(t);
      setLoading(false);
    };

    loadToken();
  }, []);

  if (loading) return null;

  if (!token) {
    return <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SyncProvider>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="terms" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="survey" options={{ headerShown: false }} />
          <Stack.Screen name="survey-audio" options={{ headerShown: false }} />
          <Stack.Screen name="survey-text" options={{ headerShown: false }} />
          <Stack.Screen name="survey-results" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </SyncProvider>
    </ThemeProvider>
  );
}
