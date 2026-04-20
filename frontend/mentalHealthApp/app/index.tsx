import WelcomeScreen from '@/components/onboarding-screens/WelcomeScreen';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const { user, jwt, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(tabs)');
    }
  }, [loading, user, jwt, router]);

  if (loading) {
    return null;
  }
  return <WelcomeScreen />;
}
