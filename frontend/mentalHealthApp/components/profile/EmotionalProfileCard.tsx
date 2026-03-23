import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type EmotionVariant = 'green' | 'coral' | 'outline';

export type EmotionTag = {
  label: string;
  variant: EmotionVariant;
};

type Props = {
  emotions: EmotionTag[];
};

const pillStyle: Record<EmotionVariant, ViewStyle> = {
  green:   { backgroundColor: '#4CC9B0', borderColor: '#4CC9B0' },
  coral:   { backgroundColor: 'transparent', borderColor: '#F27059' },
  outline: { backgroundColor: 'transparent', borderColor: '#C5BDE8' },
};

const pillTextStyle: Record<EmotionVariant, TextStyle> = {
  green:   { color: '#FFFFFF' },
  coral:   { color: '#F27059' },
  outline: { color: '#1E1830' },
};

export const EmotionalProfileCard = React.memo(function EmotionalProfileCard({ emotions }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>All-time trends</Text>
      {emotions.length === 0 ? (
        <Text style={styles.empty}>Complete a scan to see your emotional trends</Text>
      ) : (
        <View style={styles.pillGrid}>
          {emotions.map((emotion) => (
            <View key={emotion.label} style={[styles.pill, pillStyle[emotion.variant]]}>
              <Text style={[styles.pillText, pillTextStyle[emotion.variant]]}>
                {emotion.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1830',
    marginBottom: 16,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  empty: {
    fontSize: 13,
    color: '#9E8FB8',
    fontStyle: 'italic',
  },
});
