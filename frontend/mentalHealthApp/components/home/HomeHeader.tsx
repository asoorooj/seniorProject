import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarSource } from '@/constants/avatars';

// ─── Dynamic greeting ────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

// ─── Daily affirmation ────────────────────────────────────────────────────────

const AFFIRMATIONS = [
  'Small steps still move you forward.',
  'Your feelings are valid. Take a breath.',
  'Progress, not perfection.',
  'You deserve the same care you give others.',
  'Pause. Breathe. You\'ve got this.',
  'Every check-in is an act of self-care.',
  'Be gentle with yourself today.',
  'Awareness is the first step to healing.',
  'You are more resilient than you know.',
  'Rest is productive too.',
  'Today is a new opportunity.',
  'Honor what you feel without judgment.',
  'Small moments of calm add up.',
  'You don\'t have to have it all figured out.',
  'Growth isn\'t always visible. Keep going.',
  'You are enough, exactly as you are.',
  'Kindness to yourself ripples outward.',
  'One moment at a time.',
  'Your mental health matters.',
  'Take up all the space you need today.',
  'Check in with yourself — it matters.',
];

function getDailyAffirmation(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  username: string;
  avatarId: number;
};

export function HomeHeader({ username, avatarId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const greeting = getGreeting();
  const affirmation = getDailyAffirmation();

  return (
    <LinearGradient
      colors={['#2A1F50', '#1E1830']}
      style={[styles.header, { paddingTop: insets.top + 24 }]}
    >
      {/* Avatar */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/profile')}
        style={styles.avatarWrapper}
      >
        {avatarId === 0 ? (
          <View style={styles.avatarFallback}>
            <MaterialIcons name="person" size={38} color="#C5BDE8" />
          </View>
        ) : (
          <Image source={getAvatarSource(avatarId)} style={styles.avatarImage} />
        )}
      </TouchableOpacity>

      {/* Greeting headline */}
      <View style={styles.greetingBlock}>
        <Text style={styles.headlineGreeting}>{greeting}</Text>
        <Text style={styles.headlineName}>{username}</Text>
      </View>

      {/* Daily affirmation */}
      <View style={styles.affirmationPill}>
        <Text style={styles.affirmation}>{`"${affirmation}"`}</Text>
      </View>
    </LinearGradient>
  );
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    marginBottom: 4,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(155,143,232,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(155,143,232,0.5)',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(155,143,232,0.5)',
  },
  greetingBlock: {
    alignItems: 'center',
    gap: 2,
  },
  headlineGreeting: {
    fontSize: 35,
    fontWeight: '400',
    color: '#9E8FB8',
    textAlign: 'center',
  },
  headlineName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  affirmationPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  affirmation: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusStreak: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.60)',
  },
  statusSep: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
  },
  statusCheckIn: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
  statusCheckInDone: {
    color: '#F27059',
    fontWeight: '600',
  },
});
