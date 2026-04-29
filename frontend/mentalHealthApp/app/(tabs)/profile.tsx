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
import { useRouter } from 'expo-router';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AvatarPickerModal } from '@/components/profile/AvatarPickerModal';
import { EmotionalProfileCard, EmotionTag } from '@/components/profile/EmotionalProfileCard';
import { StoragePermissionsCard } from '@/components/profile/StoragePermissionsCard';
import { ConsentPermissionsCard } from '@/components/profile/ConsentPermissionsCard';
import { AccountCard } from '@/components/profile/AccountCard';
import { InterestsCard } from '@/components/profile/InterestsCard';
import { InterestsEditModal } from '@/components/profile/InterestsEditModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/assets/styles/colors';
import { sectionLabel } from "@/assets/styles/text";
import {
  fetchUserProfile,
  logout,
  type UserPreferences,
  type UserConsent,
} from '@/services/apiService';
import {
  getEmotionsCache,
  getProfileCache,
} from '@/services/repositories/profileRepository';
import { useAuth } from '@/hooks/useAuth';
import { getTotalEvals } from '@/services/repositories/journalRepository';
import { clearDatabase } from '@/services/db';

// Placeholder data used until the API is connected
const PLACEHOLDER_USER = {
  name: 'Skylar',
  memberSince: 'Member since Jan 2026',
  scans: 42,
  journals: 18,
  streak: 7,
  likes:[],
  dislikes:[]
};

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
  likes:string[];
  dislikes:string[];
};

const DEFAULT_PREFERENCES: UserPreferences = {
  pref_eval_image: true,
  pref_eval_text: true,
  pref_eval_audio: true,
};

const DEFAULT_CONSENT: UserConsent = {
  stor_cons_image: false,
  stor_cons_text: false,
  stor_cons_audio: false,
};


export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser, jwt, setJwt, setUser: setAuthUser, syncUserToCache: updateUserCache } = useAuth();
  const currentUserId = authUser?.id;
  const [user, setUser] = useState<UserProfile>(PLACEHOLDER_USER);
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [interestsEditVisible, setInterestsEditVisible] = useState(false);
  const [emotions, setEmotions] = useState<EmotionTag[]>(PLACEHOLDER_EMOTIONS);
  const [avatarId, setAvatarId] = useState(0);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [consent, setConsent] = useState<UserConsent>(DEFAULT_CONSENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(()=>{
    const getValues = async function(){
      const count = (await getTotalEvals())["COUNT(*)"];
      const rawDate = authUser?.created_at;
      const memberSince = rawDate
        ? `Member since ${new Date(rawDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        : PLACEHOLDER_USER.memberSince;
      let user:UserProfile = {
        name:authUser?.email ?? PLACEHOLDER_USER.name,
        memberSince,
        scans: count ?? PLACEHOLDER_USER.scans,
        journals: authUser?.journalCount ?? count,
        streak: authUser?.streak ?? 0,
        likes: authUser?.likes ?? [],
        dislikes: authUser?.dislikes ?? []
      };
      let preferences: UserPreferences = {
        pref_eval_audio: authUser?.preferences?.pref_eval_audio ?? false,
        pref_eval_text: authUser?.preferences?.pref_eval_text ?? false,
        pref_eval_image: authUser?.preferences?.pref_eval_image ?? false
      };
      let consent: UserConsent = {
        stor_cons_audio: authUser?.storage_consent?.stor_cons_audio ?? false,
        stor_cons_text: authUser?.storage_consent?.stor_cons_text ?? false,
        stor_cons_image: authUser?.storage_consent?.stor_cons_image ?? false,
      };
      setUser(user);
      setLikes(authUser?.likes ?? []);
      setDislikes(authUser?.dislikes ?? []);
      setPreferences(preferences);
      setConsent(consent);
      if (authUser) await updateUserCache();

      console.log("[USER]",authUser);

    };

    getValues();
  },[authUser, likes, dislikes, updateUserCache]);


  const fetchData = useCallback(async () => {
    setError(false);
    try {
        const currentUser = await fetchUserProfile();
        if (currentUser?.user?.preferences) {
          setPreferences(currentUser.user.preferences);
        }
        if (currentUser?.user?.storage_consent) {
          setConsent(currentUser.user.storage_consent);
        }
      if(currentUserId){
        const [localProfile, localEmotions] = await Promise.all([
          getProfileCache<UserProfile>(currentUserId),
          getEmotionsCache<EmotionTag[]>(currentUserId),
        ]);
        if (localProfile) setUser(localProfile);
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

    if(authUser){
      setAuthUser({...authUser, preferences:{...nextPreferences}});
    } else { //if authUser is null

    }

  }, [preferences, jwt, currentUserId]);

  const handleToggleConsent = useCallback((key: keyof UserConsent) => {
    const nextConsent = { ...consent, [key]: !consent[key] };
    setConsent(nextConsent);
    if (authUser) {
      setAuthUser({ ...authUser, storage_consent: { ...nextConsent } });
    }
  }, [consent, authUser, setAuthUser]);

  useEffect(() => {
    AsyncStorage.getItem('avatar_id').then((val) => {
      if (val) setAvatarId(Number(val));
    });
  }, []);

  const handleSelectAvatar = useCallback((id: number) => {
    setAvatarId(id);
    AsyncStorage.setItem('avatar_id', String(id));
  }, []);

  const handleSignOut = useCallback(() => {
    clearDatabase();
    logout(jwt ?? undefined).catch(() => {});
    setJwt(null); 
    setAuthUser(null);
    router.replace('/login');
  }, [jwt, setJwt, setAuthUser, router]);

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
      <View pointerEvents="none" style={styles.topBounceBackdrop} />
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
        <ProfileCard
          {...user}
          avatarId={avatarId}
          onAvatarPress={() => setAvatarPickerVisible(true)}
        />
        <AvatarPickerModal
          visible={avatarPickerVisible}
          selectedId={avatarId}
          onSelect={handleSelectAvatar}
          onClose={() => setAvatarPickerVisible(false)}
        />

        <View style={styles.content}>
          <Text style={sectionLabel}>Your Interests</Text>
          <InterestsCard
            likes={likes}
            dislikes={dislikes}
            onEdit={() => setInterestsEditVisible(true)}
          />
          <InterestsEditModal
            visible={interestsEditVisible}
            initialLikes={likes}
            initialDislikes={dislikes}
            onClose={() => setInterestsEditVisible(false)}
            onSave={(newLikes, newDislikes) => {
              setLikes(newLikes);
              setDislikes(newDislikes);
              if (authUser) setAuthUser({ ...authUser, likes: newLikes, dislikes: newDislikes });
              setInterestsEditVisible(false);
            }}
          />

          <Text style={sectionLabel}>Your Emotional Profile</Text>
          <EmotionalProfileCard emotions={emotions} />

          <Text style={sectionLabel}>Data & Privacy</Text>
          <ConsentPermissionsCard
            consent={consent}
            onToggle={handleToggleConsent}
          />
          <StoragePermissionsCard
            preferences={preferences}
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
    backgroundColor: 'transparent',
  },
  topBounceBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    backgroundColor: '#2A1F50',
  },
  body: {
    flexGrow: 1,
    paddingBottom: 110,
    gap: 0,
    backgroundColor: colors.background,
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
