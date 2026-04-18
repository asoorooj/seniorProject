import WelcomeScreen from '@/components/onboarding-screens/WelcomeScreen';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const { user, sessionId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && sessionId) {
      router.replace('/(tabs)');
    }
  }, [loading, user, sessionId, router]);

  if (loading) {
    return null;
  }
  return <WelcomeScreen />;
}
