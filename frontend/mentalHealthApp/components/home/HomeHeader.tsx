import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MOODS: { icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { icon: 'sentiment-very-dissatisfied', label: 'Angry' },
  { icon: 'sentiment-dissatisfied', label: 'Sad' },
  { icon: 'sentiment-neutral', label: 'Neutral' },
  { icon: 'sentiment-satisfied', label: 'Happy' },
  { icon: 'sentiment-very-satisfied', label: 'Excited' },
];

type Props = {
  username: string;
  greeting: string;
  selectedMood: number;
  onMoodSelect: (index: number) => void;
};

export function HomeHeader({ username, greeting, selectedMood, onMoodSelect }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#2A1F50', '#1E1830']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View style={styles.content}>

        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.username}>{username}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarInitial}>{username.charAt(0)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.question}>How are you feeling today?</Text>

        <View style={styles.moodRow}>
          {MOODS.map((mood, i) => (
            <TouchableOpacity
              key={i}
              style={styles.moodItem}
              onPress={() => onMoodSelect(i)}
              activeOpacity={0.8}
            >
              <View style={[styles.moodCircle, i === selectedMood && styles.moodCircleSelected]}>
                <MaterialIcons
                  name={mood.icon}
                  size={26}
                  color={i === selectedMood ? '#F27059' : 'rgba(255,255,255,0.6)'}
                />
              </View>
              <Text style={[styles.moodLabel, i === selectedMood && styles.moodLabelSelected]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  content: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#9E8FB8',
    letterSpacing: 1,
  },
  username: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(155,143,232,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  question: {
    fontSize: 17,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moodItem: {
    alignItems: 'center',
    gap: 5,
  },
  moodCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  moodCircleSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(242,112,89,0.6)',
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
  moodLabelSelected: {
    color: '#F27059',
    fontWeight: '700',
  },
});
