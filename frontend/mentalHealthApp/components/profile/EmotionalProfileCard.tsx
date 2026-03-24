import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { capsule, colors } from "@/assets/styles/colors";
import { pills } from "@/assets/styles/text";

export type EmotionVariant = 'green' | 'coral' | 'outline';

export type EmotionTag = {
  label: string;
  variant: EmotionVariant;
};

type Props = {
  emotions: EmotionTag[];
};

const pillStyle: Record<EmotionVariant, ViewStyle> = {
  green:   pills.pillColorTurquoiseFull,
  coral:   pills.pillColorCoralNone,
  outline: pills.pillColorLavenderNone,
};

const pillTextStyle: Record<EmotionVariant, TextStyle> = {
  green:   { color: colors.surface },
  coral:   { color: colors.primary },
  outline: { color: colors.accent },
};

export const EmotionalProfileCard = React.memo(function EmotionalProfileCard({ emotions }: Props) {
  return (
    <View style={capsule}>
      <Text style={styles.title}>All-time trends</Text>
      {emotions.length === 0 ? (
        <Text style={styles.empty}>Complete a scan to see your emotional trends</Text>
      ) : (
        <View style={styles.pillGrid}>
          {emotions.map((emotion) => (
            <View key={emotion.label} style={[pills.pill, pillStyle[emotion.variant]]}>
              <Text style={[pills.pillText, pillTextStyle[emotion.variant]]}>
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  empty: {
    fontSize: 13,
    color: colors.accentDark,
    fontStyle: 'italic',
  },
});
