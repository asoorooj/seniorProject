import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DayScore } from '@/components/home/WeeklyChart';

type Props = {
  data: DayScore[];
};

const MAX_BAR_HEIGHT = 60;

export const AvgWellbeingCard = React.memo(function AvgWellbeingCard({ data }: Props) {
  const maxScore = Math.max(...data.map((d) => d.score), 1);

  return (
    <View style={styles.card}>
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
    backgroundColor: '#F27059',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9E8FB8',
  },
  dayLabelHighlighted: {
    color: '#F27059',
    fontWeight: '700',
  },
});
