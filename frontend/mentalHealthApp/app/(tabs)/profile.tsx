import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AvgWellbeingCard } from '@/components/profile/AvgWellbeingCard';
import { EmotionalProfileCard, EmotionTag } from '@/components/profile/EmotionalProfileCard';
import { StoragePermissionsCard } from '@/components/profile/StoragePermissionsCard';
import { AccountCard } from '@/components/profile/AccountCard';
import { DayScore } from '@/components/home/WeeklyChart';
import { API_BASE } from '@/constants/api';

// Derive isToday from the current day of the week (0=Sun, 1=Mon, ..., 6=Sat)
const DAYS: DayScore['day'][] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Placeholder data used until the API is connected
const PLACEHOLDER_USER = {
  name: 'Skylar',
  memberSince: 'Member since Jan 2026',
  scans: 42,
  journals: 18,
  streak: 7,
};

const todayIndex = new Date().getDay();
const PLACEHOLDER_SCORES: DayScore[] = DAYS.map((day, i) => ({
  day,
  score: [58, 40, 75, 88, 55, 100, 62][i],
  isToday: i === todayIndex,
}));

const PLACEHOLDER_EMOTIONS: EmotionTag[] = [
  { label: 'Calm', variant: 'green' },
  { label: 'Stressed', variant: 'coral' },
  { label: 'Content', variant: 'outline' },
  { label: 'Sad', variant: 'outline' },
];

type UserProfile = {
  name: string;
  memberSince: string;
  scans: number;
  journals: number;
  streak: number;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile>(PLACEHOLDER_USER);
  const [scores, setScores] = useState<DayScore[]>(PLACEHOLDER_SCORES);
  const [emotions, setEmotions] = useState<EmotionTag[]>(PLACEHOLDER_EMOTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // During local development placeholder data shown by default.
  // Set this to true when pointing at an actual backend during integration tests.
  const USE_API = false;

  const fetchData = useCallback(async () => {
    if (!USE_API) {
      // Placeholder mode: no network call.
      return;
    }

    // Real backend mode (commented out in placeholder setup):
    setError(false);
    try {
      const [profileRes, scoresRes, emotionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/profile`),
        fetch(`${API_BASE}/api/scores/week`),
        fetch(`${API_BASE}/api/emotional-profile`),
      ]);

      if (!profileRes.ok || !scoresRes.ok || !emotionsRes.ok) {
        throw new Error('One or more requests failed');
      }

      const [profileData, scoresData, emotionsData] = await Promise.all([
        profileRes.json(),
        scoresRes.json(),
        emotionsRes.json(),
      ]);

      setUser(profileData);
      setScores(scoresData);
      setEmotions(emotionsData);
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setError(true);
    }
  }, [USE_API]);

  useEffect(() => {
    setLoading(true);
    if (USE_API) {
      fetchData().finally(() => setLoading(false));
    } else {
      // Using placeholder values, instantly finish loading.
      setLoading(false);
    }
  }, [fetchData, USE_API]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSignOut = useCallback(() => {
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    // TODO: clear stored auth token here (e.g. AsyncStorage.removeItem('token'))
    // then navigate to login: router.replace('/login')
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9B8FE8" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setLoading(true);
            fetchData().finally(() => setLoading(false));
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#9B8FE8"
            colors={['#9B8FE8']}
          />
        }
      >
        <ProfileCard {...user} />

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>This Week</Text>
          <AvgWellbeingCard data={scores} />

          <Text style={styles.sectionLabel}>Your Emotional Profile</Text>
          <EmotionalProfileCard emotions={emotions} />

          <Text style={styles.sectionLabel}>Data & Privacy</Text>
          <StoragePermissionsCard />

          <Text style={styles.sectionLabel}>Account</Text>
          <AccountCard onSignOut={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F5FF',
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingBottom: 110,
    gap: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E8FB8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9E8FB8',
  },
  retryButton: {
    backgroundColor: '#9B8FE8',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
