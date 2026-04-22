import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import { HomeHeader } from '@/components/home/HomeHeader';
import { RecommendationCard, Recommendation } from '@/components/home/RecommendationCard';
import { CheckInCard } from '@/components/home/CheckInCard';
import { WeeklyMoodStrip, DayMood } from '@/components/home/WeeklyMoodStrip';
import { useAuth } from '@/hooks/useAuth';
import { useJournalData } from '@/hooks/useJournalData';
import { getLatestEntry, RawEntry } from '@/services/repositories/journalRepository';
import { fetchEvaluationsByDate } from '@/services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Emotion → activity lookup ────────────────────────────────────────────────
// Matches the user-facing FUSION_PHRASE vocabulary from ResultsScreen.

type Activity = Pick<Recommendation, 'exerciseTitle' | 'exerciseDuration' | 'exerciseInfo' | 'steps' | 'icon'>;

const ACTIVITIES: Record<string, Activity> = {
  angry: {
    exerciseTitle: '4-7-8 Breathing',
    exerciseDuration: '5 minute exercise',
    exerciseInfo: 'Release tension by slowing your nervous system. Breathe in for 4 seconds, hold for 7, then exhale fully for 8.',
    steps: ['Inhale  4s', 'Hold  7s', 'Exhale  8s', 'Repeat  4×'],
    icon: 'air',
  },
  fear: {
    exerciseTitle: '5-4-3-2-1 Grounding',
    exerciseDuration: '3 minute exercise',
    exerciseInfo: 'Interrupt anxious thoughts by engaging your senses and anchoring yourself in the present moment.',
    steps: ['5 things you see', '4 you can touch', '3 you hear', '2 you smell'],
    icon: 'self-improvement',
  },
  happy: {
    exerciseTitle: 'Gratitude Reflection',
    exerciseDuration: '5 minute practice',
    exerciseInfo: 'Anchor positive feelings by noting what went well. This strengthens emotional resilience over time.',
    steps: ['Find a quiet spot', 'Note 3 wins today', 'Feel each moment', 'Carry it forward'],
    icon: 'favorite',
  },
  sad: {
    exerciseTitle: 'Self-Compassion Pause',
    exerciseDuration: '5 minute exercise',
    exerciseInfo: "Treat yourself with the kindness you'd offer a friend. Acknowledge your feelings without judgment.",
    steps: ['Breathe slowly', 'Acknowledge pain', "You're not alone", 'Offer kindness'],
    icon: 'favorite_border',
  },
  surprise: {
    exerciseTitle: 'Body Scan',
    exerciseDuration: '5 minute exercise',
    exerciseInfo: 'After unexpected events, reconnect with your body. Slowly scan from head to toe, releasing held tension.',
    steps: ['Sit or lie still', 'Scan head to toe', 'Release tension', 'Breathe deeply'],
    icon: 'accessibility_new',
  },
  neutral: {
    exerciseTitle: 'Box Breathing',
    exerciseDuration: '5 minute exercise',
    exerciseInfo: 'Maintain your calm with box breathing. Inhale, hold, exhale, hold — each for 4 seconds.',
    steps: ['Inhale  4s', 'Hold  4s', 'Exhale  4s', 'Hold  4s'],
    icon: 'air',
  },
};

function getMoodLabel(mood: string): string {
  const m = mood.toLowerCase();
  if (m.includes('anger') || m.includes('angry')) return 'Tense';
  if (m.includes('fear')) return 'Anxious';
  if (m.includes('happy')) return 'Joyful';
  if (m.includes('sad')) return 'Low';
  if (m.includes('surprise')) return 'Surprised';
  return 'Calm';
}

function getActivity(mood: string): Activity {
  const m = mood.toLowerCase();
  if (m.includes('anger') || m.includes('angry')) return ACTIVITIES.angry;
  if (m.includes('fear')) return ACTIVITIES.fear;
  if (m.includes('happy')) return ACTIVITIES.happy;
  if (m.includes('sad')) return ACTIVITIES.sad;
  if (m.includes('surprise')) return ACTIVITIES.surprise;
  return ACTIVITIES.neutral;
}

function buildRecommendation(entry: RawEntry): Recommendation {
  const moodLabel = getMoodLabel(entry.mood);
  const activity = getActivity(entry.mood);
  return {
    title: `You were feeling ${moodLabel}`,
    description: entry.suggestion ?? `Here's something that may help after feeling ${moodLabel.toLowerCase()}.`,
    ...activity,
  };
}

// ─── Empty week fallback ──────────────────────────────────────────────────────

const EMPTY_DAYS: DayMood[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(label => ({
  date: '',
  label,
  mood: null,
  isToday: false,
}));

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { weekData, weekLoading, allWeekEntries, weekProminentEmotion } = useJournalData();

  const [avatarId, setAvatarId] = useState(0);

  // undefined = loading, null = no entry, RawEntry = has data
  const [latestEntry, setLatestEntry] = useState<RawEntry | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('avatar_id').then(val => setAvatarId(val ? Number(val) : 0));
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLatestEntry(undefined);

      const load = async () => {
        // Try SQLite first (populated after a full sync)
        let entry = await getLatestEntry(user?.id);

        // SQLite empty — fall back to API for the current week
        if (!entry) {
          try {
            const ws = new Date();
            ws.setDate(ws.getDate() - ws.getDay());
            ws.setHours(0, 0, 0, 0);
            const startDate = `${ws.getMonth() + 1}/${ws.getDate()}/${ws.getFullYear()}`;
            const data = await fetchEvaluationsByDate({ userId: user?.id, startDate });

            if (data?.evaluations?.length) {
              const ms = (scores: any): number => {
                if (!scores) return 0;
                const vals = Object.entries(scores as Record<string, unknown>)
                  .filter(([k]) => k !== '_raw_label')
                  .map(([, v]) => Number(v) || 0);
                return vals.length ? Math.round(Math.max(...vals) * 100) : 0;
              };
              const sorted = [...data.evaluations].sort(
                (a: any, b: any) =>
                  new Date(b.evaluation.timestamp).getTime() -
                  new Date(a.evaluation.timestamp).getTime()
              );
              const e = sorted[0];
              entry = {
                id: String(e.evaluation.id),
                timestamp: e.evaluation.timestamp,
                mood: e.evaluation.label ?? 'unknown',
                score: ms(e.evaluation.scores),
                face: { score: ms(e.image?.scores), label: e.image?.label ?? 'unknown' },
                voice: { score: ms(e.audio?.scores), label: e.audio?.label ?? 'unknown' },
                text: { score: ms(e.text?.scores), label: e.text?.label ?? 'unknown' },
                journal_text: null,
                suggestion: e.evaluation.suggestion ?? null,
                tip: null,
              };
            }
          } catch {
            // API unavailable — leave as null
          }
        }

        if (!cancelled) setLatestEntry(entry);
      };

      load();
      return () => { cancelled = true; };
    }, [user?.id])
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const moodByDay: Record<string, string> = {};
  for (const entry of allWeekEntries) {
    moodByDay[entry.timestamp.split('T')[0]] = entry.mood;
  }

  const days: DayMood[] = weekLoading || !weekData
    ? EMPTY_DAYS
    : weekData.days.map(d => ({
        date: d.date,
        label: d.label,
        mood: moodByDay[d.date] ?? null,
        isToday: d.date === todayStr,
      }));

  const recommendation = latestEntry ? buildRecommendation(latestEntry) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <HomeHeader
          username={
            user?.email
              ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              : 'there'
          }
          avatarId={avatarId}
        />

        <View style={styles.body}>
          <RecommendationCard
            data={recommendation}
            loading={latestEntry === undefined}
          />
          <CheckInCard onStartScan={() => router.push('/survey')} />
          <WeeklyMoodStrip
            days={days}
            scanCount={allWeekEntries.length}
            prominentMood={weekProminentEmotion}
            loading={weekLoading}
            onViewAll={() => router.push('/(tabs)/statistics')}
          />
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
    backgroundColor: '#F8F5FF',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 16,
  },
});