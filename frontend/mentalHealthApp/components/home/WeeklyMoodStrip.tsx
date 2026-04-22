import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type DayMood = {
  date: string;
  label: string;
  mood: string | null;
  isToday: boolean;
};

type Props = {
  days: DayMood[];
  scanCount: number;
  prominentMood?: string;
  loading?: boolean;
  onViewAll?: () => void;
};

// Mirrors the FUSION_PHRASE vocabulary from ResultsScreen.
// Disgust has no user-facing label in the app — falls through to Calm.
const MOOD_MAP: [string, string, string][] = [
  ['anger',   '#F27059', 'Tense'],
  ['angry',   '#F27059', 'Tense'],
  ['fear',    '#F0A050', 'Anxious'],
  ['happy',   '#4DAF82', 'Joyful'],
  ['sad',     '#6B9FD4', 'Low'],
  ['surprise','#E07FC0', 'Surprised'],
  ['neutral', '#9B8FE8', 'Calm'],
  ['disgust', '#9B8FE8', 'Calm'],
];

const LEGEND: { color: string; label: string }[] = [
  { color: '#4DAF82', label: 'Joyful' },
  { color: '#9B8FE8', label: 'Calm' },
  { color: '#F27059', label: 'Tense' },
  { color: '#F0A050', label: 'Anxious' },
  { color: '#6B9FD4', label: 'Low' },
  { color: '#E07FC0', label: 'Surprised' },
];
const LEGEND_ITEMS_PER_ROW = 3;
const LEGEND_ROWS = Array.from(
  { length: Math.ceil(LEGEND.length / LEGEND_ITEMS_PER_ROW) },
  (_, rowIndex) =>
    LEGEND.slice(
      rowIndex * LEGEND_ITEMS_PER_ROW,
      (rowIndex + 1) * LEGEND_ITEMS_PER_ROW,
    ),
);

function withAlpha(hex: string, alphaHex: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}

function getMoodColor(mood: string | null): string | null {
  if (!mood) return null;
  const m = mood.toLowerCase();
  for (const [key, color] of MOOD_MAP) {
    if (m.includes(key)) return color;
  }
  return '#9B8FE8';
}

function getMoodName(mood: string | null): string {
  if (!mood) return '';
  const m = mood.toLowerCase();
  for (const [key, , name] of MOOD_MAP) {
    if (m.includes(key)) return name;
  }
  return 'Calm';
}

const DOT = 34;
const RING = 44;

export function WeeklyMoodStrip({ days, scanCount, prominentMood, loading, onViewAll }: Props) {
  const subtitle = loading
    ? '—'
    : scanCount === 0
    ? 'No scans yet this week'
    : [
        `${scanCount} scan${scanCount !== 1 ? 's' : ''}`,
        prominentMood ? `mostly ${getMoodName(prominentMood).toLowerCase()}` : null,
      ]
        .filter(Boolean)
        .join('  ·  ');

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>This Week</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.viewAll}>View all  ›</Text>
        </TouchableOpacity>
      </View>

      {/* Dot strip */}
      <View style={styles.strip}>
        {days.map((day, i) => {
          const color = getMoodColor(day.mood);
          return (
            <View key={`${day.date}-${i}`} style={styles.dayCol}>
              <View style={[styles.ring, day.isToday && styles.ringToday]}>
                <View
                  style={[
                    styles.dot,
                    color ? { backgroundColor: color } : styles.dotEmpty,
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {LEGEND_ROWS.map((row, rowIndex) => (
          <View key={`legend-row-${rowIndex}`} style={styles.legendRow}>
            {row.map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendChip,
                    {
                      borderColor: withAlpha(color, '66'),
                      backgroundColor: withAlpha(color, '14'),
                    },
                  ]}
                >
                  <Text style={[styles.legendLabel, { color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
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
  headerText: {
    flex: 1,
    paddingRight: 12,
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
    marginTop: 3,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '400',
    color: '#F27059',
  },

  // Dot strip
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringToday: {
    borderColor: '#F27059',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#D4CDE8',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9E8FB8',
  },
  dayLabelToday: {
    color: '#F27059',
    fontWeight: '700',
  },

  // Legend
  legend: {
    marginTop: 4,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  legendChip: {
    width: '100%',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
