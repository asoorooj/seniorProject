import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, colorDefinition } from '@/assets/styles/colors';
import { sectionLabel, pills } from "@/assets/styles/text";
import { LogEntry } from '@/components/journal/LogEntry';
import { WeekPicker } from '@/components/journal/WeekPicker';
import { useJournalData } from '@/hooks/useJournalData';

export default function JournalScreen() {
  const [pickerVisible, setPickerVisible] = useState(false);

  const {
    weekStart,
    weekData,
    entries,
    selectedDayIndex,
    dayLoading,
    selectDay,
    selectWeek,
  } = useJournalData();

  const weekRangeLabel = weekData
      ? `${weekData.days[0].displayDate}  —  ${weekData.days[6].displayDate}`
      : '...';

  return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Journal</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* ── Week range selector ─────────────────────────────────── */}
          <TouchableOpacity
              style={[pills.pill, pills.pillAddonLessPadding, pills.pillColorCoralLight]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.85}
          >
            <Text style={[pills.pillText, colorDefinition.colorPrimary]}>
              {weekRangeLabel}
            </Text>
            <Text style={styles.weekSelectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* ── Day strip ───────────────────────────────────────────── */}
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateStrip}
              contentContainerStyle={styles.dateStripContent}
          >
            {weekData
                ? weekData.days.map((day, i) => (
                    <TouchableOpacity
                        key={day.date}
                        onPress={() => selectDay(i)}
                        style={styles.dateItem}
                    >
                      <Text style={[
                        styles.dateText,
                        i === selectedDayIndex && styles.dateTextActive
                      ]}>
                        {new Date().toLocaleDateString('en-CA') === day.date
                            ? "TODAY"
                            : day.displayDate}
                      </Text>
                      {i === selectedDayIndex && (
                          <Text style={styles.dateActiveArrow}>▼</Text>
                      )}
                    </TouchableOpacity>
                ))
                : Array.from({ length: 7 }).map((_, i) => (
                    <View key={i} style={styles.dateSkeleton} />
                ))
            }
          </ScrollView>

          {/* ── Log ────────────────────────────────────────────────── */}
          <View style={styles.logHeader}>
            <Text style={sectionLabel}>Log</Text>
          </View>

          {dayLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.dayLoader} />
          ) : entries.length === 0 ? (
              <Text style={styles.emptyText}>No entries for this day.</Text>
          ) : (
              <View style={styles.timeline}>
                <View style={styles.timelineLine} />
                {entries.map(entry => (
                    <LogEntry key={entry.id} entry={entry} />
                ))}
              </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ── Week picker modal ───────────────────────────────────── */}
        <WeekPicker
            visible={pickerVisible}
            currentWeekStart={weekStart}
            onSelect={selectWeek}
            onClose={() => setPickerVisible(false)}
        />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.marginHorizontal,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderColor: colors.primary,
    borderWidth: spacing.defaultBorderWidth,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
    paddingBottom: 2,
  },

  weekSelectorArrow: { fontSize: 10, color: colors.primary },

  dateStrip: { paddingTop: 10 },
  dateStripContent: { paddingHorizontal: spacing.marginHorizontal, gap: 16 },
  dateItem: {
    paddingVertical: 4,
    paddingBottom: 14,
    alignItems: 'center',
  },
  dateActiveArrow: {
    fontSize: 12,
    color: colors.accent,
    textAlign: 'center',
    position: 'absolute',
    bottom: 0,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  dateTextActive: {
    color: colors.accent,
    fontWeight: '700'
  },
  dateSkeleton: {
    width: 52,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.timelineLine,
  },

  logHeader: {
    marginHorizontal: spacing.marginHorizontal,
    marginTop: 24,
    marginBottom: 12,
  },

  timeline: {
    paddingLeft: 26,
    paddingRight: spacing.marginHorizontal
  },
  timelineLine: {
    position: 'absolute',
    left: 32,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.timelineLine,
  },
  dayLoader: { marginTop: 40 },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 40,
  },
});