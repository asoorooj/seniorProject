import WelcomeScreen from '@/components/onboarding-screens/WelcomeScreen';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getNeedsOnboarding } from '@/services/auth';

export default function Index() {
  const { user, jwt, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;

    const routeAuthenticatedUser = async () => {
      const needsOnboarding = await getNeedsOnboarding();
      if (cancelled) return;
      router.replace(needsOnboarding ? '/onboarding' : '/(tabs)');
    };

    routeAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [loading, user, jwt, router]);

  return <WelcomeScreen />;
}
