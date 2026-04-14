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
import { ConsentPermissionsCard } from '@/components/profile/ConsentPermissionsCard';
import { AccountCard } from '@/components/profile/AccountCard';
import { DayScore } from '@/components/home/WeeklyChart';
import { colors } from '@/assets/styles/colors';
import { sectionLabel } from "@/assets/styles/text";
import {
  fetchCurrentUser,
  logout,
  type UserPreferences,
  updateUserPreferences,
} from '@/services/apiService';
import {
  getEmotionsCache,
  getProfileCache,
  getScoresCache,
} from '@/services/repositories/profileRepository';
import {
  clearLocalData,
  syncProfileCaches,
} from '@/services/sync/syncController';

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

const DEFAULT_PREFERENCES: UserPreferences = {
  eval_face: true,
  eval_audio: true,
  eval_text: true,
};

const CURRENT_USER_ID = 1;

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile>(PLACEHOLDER_USER);
  const [scores, setScores] = useState<DayScore[]>(PLACEHOLDER_SCORES);
  const [emotions, setEmotions] = useState<EmotionTag[]>(PLACEHOLDER_EMOTIONS);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [cachedProfile, cachedScores, cachedEmotions] = await Promise.all([
        getProfileCache<UserProfile>(),
        getScoresCache<DayScore[]>(),
        getEmotionsCache<EmotionTag[]>(),
      ]);
      if (cachedProfile) setUser(cachedProfile);
      if (cachedScores) setScores(cachedScores);
      if (cachedEmotions) setEmotions(cachedEmotions);

      const currentUser = await fetchCurrentUser(CURRENT_USER_ID);
      if (currentUser?.user?.preferences) {
        setPreferences(currentUser.user.preferences);
      }

      const synced = await syncProfileCaches();
      if (synced?.profile) setUser(synced.profile);
      if (synced?.scores) setScores(synced.scores);
      if (synced?.emotions) setEmotions(synced.emotions);
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setError(true);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleTogglePreference = useCallback(async (key: keyof UserPreferences) => {
    const nextPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    if (!nextPreferences.eval_face && !nextPreferences.eval_audio && !nextPreferences.eval_text) {
      return;
    }

    setPreferences(nextPreferences);
    setSavingPreferences(true);

    const updated = await updateUserPreferences(CURRENT_USER_ID, nextPreferences);
    if (!updated?.preferences) {
      setPreferences(preferences);
    }

    setSavingPreferences(false);
  }, [preferences]);

  const handleSignOut = useCallback(() => {
    clearLocalData().catch(() => {});
    logout().catch(() => {});
    // TODO: clear stored auth token here (e.g. AsyncStorage.removeItem('token'))
    // then navigate to login: router.replace('/login')
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
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
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <ProfileCard {...user} />

        <View style={styles.content}>
          <Text style={sectionLabel}>This Week</Text>
          <AvgWellbeingCard data={scores} />

          <Text style={sectionLabel}>Your Emotional Profile</Text>
          <EmotionalProfileCard emotions={emotions} />

          <Text style={sectionLabel}>Data & Privacy</Text>
          <ConsentPermissionsCard />
          <StoragePermissionsCard
            preferences={preferences}
            saving={savingPreferences}
            onToggle={handleTogglePreference}
          />

          <Text style={sectionLabel}>Account</Text>
          <AccountCard onSignOut={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.accentDark,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
});
