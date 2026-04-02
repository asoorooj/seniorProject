import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { HomeHeader } from '@/components/home/HomeHeader';
import { RecommendationCard, Recommendation } from '@/components/home/RecommendationCard';
import { CheckInCard } from '@/components/home/CheckInCard';
import { WeeklyChart, DayScore } from '@/components/home/WeeklyChart';

// Placeholder — replace with API response from GET /api/recommendations/today
const RECOMMENDATION: Recommendation = {
  title: 'Try a breathing exercise',
  description:
    'You were in a state of being anxious. A 5 minute box breathing is recommended.',
  exerciseTitle: 'Box Breathing',
  exerciseDuration: '5 minute exercise',
  exerciseInfo:
    'Box breathing helps calm your nervous system. Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4 — repeat.',
  steps: ['Inhale  4s', 'Hold  4s', 'Exhale  4s', 'Hold  4s'],
};

// Placeholder — replace with API response from GET /api/scores/week
const WEEKLY_SCORES: DayScore[] = [
  { day: 'Mon', score: 58 },
  { day: 'Tue', score: 40 },
  { day: 'Wed', score: 78 },
  { day: 'Thu', score: 90 },
  { day: 'Fri', score: 58 },
  { day: 'Sat', score: 100, isToday: true },
  { day: 'Sun', score: 66 },
];

export default function HomeScreen() {
  const [selectedMood, setSelectedMood] = useState(2);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <HomeHeader
          username="SKYLAR !"
          greeting="GOOD AFTERNOON,"
          selectedMood={selectedMood}
          onMoodSelect={setSelectedMood}
        />

        <View style={styles.body}>
          <RecommendationCard data={RECOMMENDATION} />
          <CheckInCard onStartScan={() => router.push('/survey')} />
          <WeeklyChart data={WEEKLY_SCORES} onViewAll={() => {}} />
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