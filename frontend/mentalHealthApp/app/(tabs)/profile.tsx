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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  syncAllUnsynced,
} from '@/services/sync/syncController';
import { useAuth } from '@/hooks/useAuth';
import { getTotalEvals } from '@/services/repositories/journalRepository';

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
  pref_eval_image: true,
  pref_eval_text: true,
  pref_eval_audio: true,
};


export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser, jwt, setJwt, setUser: setAuthUser, syncUserToCache: updateUserCache } = useAuth();
  const currentUserId = authUser?.id;
  const [user, setUser] = useState<UserProfile>(PLACEHOLDER_USER);
  const [scores, setScores] = useState<DayScore[]>(PLACEHOLDER_SCORES);
  const [emotions, setEmotions] = useState<EmotionTag[]>(PLACEHOLDER_EMOTIONS);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(()=>{
    const getValues = async function(){
      const count = (await getTotalEvals())["COUNT(*)"];
      let user:UserProfile = {
        name:authUser?.email ?? PLACEHOLDER_USER.name,
        memberSince: String(authUser?.created_at) ?? PLACEHOLDER_USER.memberSince,
        scans: PLACEHOLDER_USER.scans,
        journals: authUser?.journalCount ?? count,
        streak: authUser?.streak ?? 0
      };
      let preferences: UserPreferences = {
        pref_eval_audio: authUser?.preferences?.pref_eval_audio ?? false,
        pref_eval_text: authUser?.preferences?.pref_eval_text ?? false,
        pref_eval_image: authUser?.preferences?.pref_eval_image ?? false
      };
      setUser(user);
      setPreferences(preferences);
      await updateUserCache();
    };

    getValues();
  },[authUser]);


  const fetchData = useCallback(async () => {
    setError(false);
    try {
      if (sessionId) {
        await syncAllUnsynced(sessionId, "action");
        const currentUser = await fetchCurrentUser();
        if (currentUser?.user?.preferences) {
          setPreferences(currentUser.user.preferences);
        }
      if(currentUserId){
        const [localProfile, localScores, localEmotions] = await Promise.all([
          getProfileCache<UserProfile>(currentUserId),
          getScoresCache<DayScore[]>(currentUserId),
          getEmotionsCache<EmotionTag[]>(currentUserId),
        ]);      
        if (localProfile) setUser(localProfile);
        if (localScores) setScores(localScores);
        if (localEmotions) setEmotions(localEmotions);
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setError(true);
    }
  }, [currentUserId, jwt]);

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

    // if (!nextPreferences.pref_eval_audio && !nextPreferences.pref_eval_text && !nextPreferences.pref_eval_image) {
    //   return;
    // }

    if(authUser){
      setAuthUser({...authUser, preferences:{...nextPreferences}});
    } else { //if authUser is null

    if (!sessionId) {
      setPreferences(preferences);
      setSavingPreferences(false);
      return;
    }
    const updated = await updateUserPreferences(currentUserId, nextPreferences);
    if (!updated?.preferences) {
      setPreferences(preferences);
    } else {
      await syncAllUnsynced(sessionId, "action");
    }

    // setPreferences(nextPreferences);
    // setSavingPreferences(true);

    // if (!jwt) {
    //   setPreferences(preferences);
    //   setSavingPreferences(false);
    //   return;
    // }
    // const updated = await updateUserPreferences(nextPreferences,currentUserId);
    // if (!updated?.preferences) {
    //   setPreferences(preferences);
    // } else {
    //   await syncAllUnsynced(jwt, "action");
    // }

    // setSavingPreferences(false);
  }, [preferences, jwt, currentUserId]);

  const handleSignOut = useCallback(() => {
      Alert.alert(
        'Sign out?',
        'You will be returned to the login screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: async () => {
              await clearLocalData();
              setSessionId(null);
              setAuthUser(null);
              router.replace('/login');
          }},
        ]
      );
    }, [sessionId, setSessionId, setAuthUser, router]);

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
          {/* <ConsentPermissionsCard /> */}
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
