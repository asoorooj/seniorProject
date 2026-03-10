import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type DayScore = {
  day: string;
  score: number;  // 0–100
  isToday?: boolean;
};

type Props = {
  data: DayScore[];
  onViewAll?: () => void;
};

const MAX_BAR_HEIGHT = 60;

export function WeeklyChart({ data, onViewAll }: Props) {
  const maxScore = Math.max(...data.map((d) => d.score), 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>This Week</Text>
          <Text style={styles.subtitle}>Wellbeing score per day</Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>View all  ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chart}>
        {data.map((item, i) => {
          const barHeight = (item.score / maxScore) * MAX_BAR_HEIGHT;
          return (
            <View key={i} style={styles.column}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(barHeight, 4) },
                    item.isToday && styles.barToday,
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, item.isToday && styles.dayLabelToday]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 25,
    padding: 20,
    shadowColor: '#1E1830',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1830',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9E8FB8',
    marginTop: 2,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '400',
    color: '#F27059',
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
    width: 32,
    backgroundColor: 'rgba(155,143,232,0.30)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barToday: {
    backgroundColor: '#F27059',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9E8FB8',
  },
  dayLabelToday: {
    color: '#F27059',
    fontWeight: '700',
  },
});
