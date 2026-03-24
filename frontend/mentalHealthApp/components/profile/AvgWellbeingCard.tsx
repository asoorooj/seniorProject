import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DayScore } from '@/components/home/WeeklyChart';
import { capsule, colors } from "@/assets/styles/colors";

type Props = {
  data: DayScore[];
};

const MAX_BAR_HEIGHT = 60;

export const AvgWellbeingCard = React.memo(function AvgWellbeingCard({ data }: Props) {
  const maxScore = Math.max(...data.map((d) => d.score), 1);

  return (
    <View style={capsule}>
      <Text style={styles.title}>Avg Wellbeing</Text>
      <View style={styles.chart}>
        {data.map((item, i) => {
          const barHeight = (item.score / maxScore) * MAX_BAR_HEIGHT;
          return (
            <View key={`${item.day}-${i}`} style={styles.column}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(barHeight, 4) },
                    item.isToday && styles.barHighlighted,
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, item.isToday && styles.dayLabelHighlighted]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 18,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
  },
  column: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  barWrapper: {
    height: 64,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 28,
    backgroundColor: 'rgba(155, 143, 232, 0.25)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barHighlighted: {
    backgroundColor: colors.primary,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.accentDark,
  },
  dayLabelHighlighted: {
    color: colors.primary,
    fontWeight: '700',
  },
});
