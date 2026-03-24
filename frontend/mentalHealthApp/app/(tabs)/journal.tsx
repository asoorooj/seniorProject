import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, colorDefinition } from '@/assets/styles/colors';
import { sectionLabel, pills } from "@/assets/styles/text";
import { Sparkline } from '@/components/journal/Sparkline';
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
    weekLoading,
    dayLoading,
    selectDay,
    selectWeek,
  } = useJournalData();

  // Build the header week date range string e.g. "MAR 15 – MAR 21"
  const weekRangeLabel = weekData
      ? `${weekData.days[0].displayDate}  —  ${weekData.days[6].displayDate}`
      : '...';

  const METRICS = weekData
      ? [
        { value: weekData.metrics.face,  color: colors.barFace,  icon: '📷' },
        { value: weekData.metrics.voice, color: colors.barVoice, icon: '🎙' },
        { value: weekData.metrics.text,  color: colors.barText,  icon: '📝' },
      ]
      : [];

  return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Journal</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* ── Week range selector ───────────────────────────────────── */}
          {/*
            Tapping this opens the WeekPicker modal
            it shows the current week's date range
          */}
          <TouchableOpacity
              style={[pills.pill, pills.pillAddonLessPadding, pills.pillColorCoralLight]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.85}
          >
            <Text style={[pills.pillText, colorDefinition.colorPrimary]}>{weekRangeLabel}</Text>
            <Text style={styles.weekSelectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* ── Day strip ─────────────────────────────────────────────── */}
          {/*
            One pill per day in the selected week (Sun–Sat)
            tapping a pill calls selectDay() which triggers a new API fetch
          */}
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
                      <Text style={[styles.dateText, i === selectedDayIndex && styles.dateTextActive]}>
                        {
                        (new Date().toISOString().split('T')[0]) == day.date ? "TODAY" : day.displayDate
                      }
                      </Text>
                      {i === selectedDayIndex && (
                          <Text style={styles.dateActiveArrow}>▼</Text>
                      )}
                    </TouchableOpacity>
                ))
                : // Skeleton placeholders while loading
                Array.from({ length: 7 }).map((_, i) => (
                    <View key={i} style={styles.dateSkeleton} />
                ))
            }
          </ScrollView>

          {/* ── Weekly Well-being row ────────────────────────────────────────── */}
          <View style={styles.wellbeingRow}>
            <View>
              {weekLoading
                  ? <ActivityIndicator color={colors.accent} />
                  : <>
                    <Text style={styles.avgScore}>{weekData?.weekScore ?? '—'}</Text>
                    <Text style={styles.avgLabel}>WEEKLY WELL-BEING</Text>
                  </>
              }
            </View>
            <View style={styles.sparklineBlock}>
              {weekData && (
                  <Sparkline points={weekData.sparklinePoints} activeIndex={selectedDayIndex} />
              )}
              {/* Day-of-week labels below chart */}
              <View style={styles.weekLabels}>
                {(weekData?.days ?? Array.from({ length: 7 })).map((day: any, i: number) => (
                    <Text key={i} style={[
                      styles.weekLabel,
                      i === selectedDayIndex && styles.weekLabelActive,
                    ]}>
                      {day?.label ?? '·'}
                    </Text>
                ))}
              </View>
            </View>
          </View>

          {/* ── Model weekly average metric confidence cards ──────────────────────────────────── */}
          <View style={styles.metricsParent}>
            <Text style={sectionLabel}>Average Confidence</Text>
            {weekLoading
                ? <View style={styles.metricCapsuleSkeleton} />
                : <View style={styles.metricCapsule}>
                  {METRICS.map((m, i) => (
                      <React.Fragment key={i}>
                        <View style={styles.metricCapsuleSection}>
                          <Text style={[styles.metricValue, { color: m.color }]}>{m.value}%</Text>
                          <Text style={styles.metricIcon}>{m.icon}</Text>
                        </View>
                        {i < METRICS.length - 1 && (
                            <View style={[styles.metricDivider]} />
                        )}
                      </React.Fragment>
                  ))}
                </View>
            }
          </View>

          {/* ── Log ──────────────────────────────────────────────────── */}
          <View style={styles.metricsParent}>
            <Text style={sectionLabel}>Log</Text>
          </View>

          {dayLoading
              ? <ActivityIndicator
                  color={colors.accent}
                  style={styles.dayLoader}
              />
              : entries.length === 0
                  ? <Text style={styles.emptyText}>No entries for this day.</Text>
                  : <View style={styles.timeline}>
                    <View style={styles.timelineLine} />
                    {entries.map(entry => (
                        <LogEntry key={entry.id} entry={entry} />
                    ))}
                  </View>
          }

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ── Week picker modal ─────────────────────────────────────── */}
        <WeekPicker
            visible={pickerVisible}
            currentWeekStart={weekStart}
            onSelect={selectWeek}
            onClose={() => setPickerVisible(false)}
        />
      </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

{/*
  paddingHorizontal controls the size of container padding (rlly only used in DATE - DATE)
  marginHorizontal controls the margins of all objects on screen
  defaultBorderWidth controls the border size of buttons for the darker outline
*/}

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
  headerTitle: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderColor: colors.primary,
    borderWidth: spacing.defaultBorderWidth,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
    paddingBottom: 2,          // nudges the + down slightly to visually center it
  },

  // Week range pill
  weekSelector: {
    marginHorizontal: spacing.marginHorizontal - spacing.paddingHorizontal,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,

    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    borderWidth: spacing.defaultBorderWidth,
    paddingHorizontal: spacing.paddingHorizontal,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  weekSelectorText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  weekSelectorArrow: { fontSize: 10, color: colors.primary },

  // Date strip
  dateStrip: { paddingTop: 10 },
  dateStripContent: { paddingHorizontal: spacing.marginHorizontal, gap: 16 },
  dateItem: {
    paddingVertical: 4,
    paddingBottom: 14,
    alignItems: 'center', // centers the arrow under the text
  },
  dateActiveArrow: {
    fontSize: 12,
    color: colors.accent,
    textAlign: 'center',
    position: 'absolute',
    bottom: 0, // sits at the bottom of the padded dateItem
  },
  dateText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  dateTextActive: { color: colors.accent, fontWeight: '700' },
  dateSkeleton: {
    width: 52, height: 16, borderRadius: 8,
    backgroundColor: colors.timelineLine,
  },

  // Well-being
  wellbeingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.marginHorizontal,
    marginTop: 4,
    paddingBottom: 14,
    minHeight: 80,
  },
  avgScore: { fontSize: 64, fontWeight: '900', color: colors.textPrimary, letterSpacing: -2 },
  avgLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  sparklineBlock: { alignItems: 'center' },
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between', width: 180, marginTop: 4 },
  weekLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', width: 22, textAlign: 'center' },
  weekLabelActive: { color: colors.weekLabelActive, fontWeight: '700' },

  // Metric cards
  metricsParent: {
    flexDirection: 'column',
    alignItems: "stretch",
    gap: 8,
    marginHorizontal: spacing.marginHorizontal,
    marginTop: 12
  },
  metricLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1.5,
  },
  metricCapsule: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.textSecondary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metricCapsuleSection: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricDivider: {
    width: 3,
    backgroundColor: colors.background,
    borderRadius: 1,
  },
  metricCapsuleSkeleton: {
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.timelineLine,
  },
  metricValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  metricIcon: { fontSize: 18 },

  // Log
  logLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    letterSpacing: 1.5, marginHorizontal: spacing.marginHorizontal, marginTop: 28, marginBottom: 12,
  },
  timeline: { paddingLeft: 26, paddingRight: spacing.marginHorizontal },
  timelineLine: {
    position: 'absolute', left: 32, top: 0, bottom: 0,
    width: 2, backgroundColor: colors.timelineLine,
  },
  dayLoader: { marginTop: 40 },
  emptyText: {
    textAlign: 'center', color: colors.textSecondary,
    fontSize: 14, marginTop: 40,
  },
});
