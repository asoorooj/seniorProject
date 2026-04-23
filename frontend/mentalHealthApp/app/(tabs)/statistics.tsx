// app/(tabs)/statistics.tsx
import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, colorDefinition } from '@/assets/styles/colors';
import { sectionLabel, pills } from "@/assets/styles/text";
import { EmotionRadar } from '@/components/journal/EmotionRadar';
import { WeekPicker } from '@/components/journal/WeekPicker';
import { MonthPicker } from '@/components/journal/MonthPicker';
import { EmotionCalendar } from '@/components/journal/EmotionCalendar';
import { useJournalData } from '@/hooks/useJournalData';
import { useAuth } from '@/hooks/useAuth';

export default function StatisticsScreen() {
    const [weekPickerVisible, setWeekPickerVisible] = useState(false);
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const { user, setUser } = useAuth();

    const {
        weekStart,
        weekData,
        weekLoading,
        weekEmotionCounts,
        weekProminentEmotion,
        selectWeek,
        allWeekEntries
    } = useJournalData();

    const weekRangeLabel = weekData
        ? `${weekData.days[0].displayDate}  —  ${weekData.days[6].displayDate}`
        : '...';

    const monthLabel = selectedMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    }).toUpperCase();

    const mapMoodToCalendar = (mood: string) => {
        const m = mood.toLowerCase();

        if (m.includes('happy')) return 'Happy';
        if (m.includes('sad')) return 'Sad';
        if (m.includes('fear')) return 'Fear';
        if (m.includes('anger')) return 'Anger';
        if (m.includes('disgust')) return 'Disgust';
        return 'Neutral';
    };

    const buildMonthEmotions = (
        entries: any[],
        month: number,
        year: number
    ) => {
        const result: Record<number, string> = {};

        for (const entry of entries) {
            const date = new Date(entry.timestamp);

            if (
                date.getMonth() !== month ||
                date.getFullYear() !== year
            ) continue;

            const day = date.getDate();

            // If multiple entries in a day → last one wins (simple version)
            result[day] = mapMoodToCalendar(entry.mood ?? 'neutral');
        }

        return result;
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Header ───────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Statistics</Text>
                </View>

                {/* ── View Toggle (Week/Month) ────────────────────────── */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            viewMode === 'week' && styles.toggleButtonActive
                        ]}
                        onPress={() => setViewMode('week')}
                    >
                        <Text style={[
                            styles.toggleText,
                            viewMode === 'week' && styles.toggleTextActive
                        ]}>
                            Week
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            viewMode === 'month' && styles.toggleButtonActive
                        ]}
                        onPress={() => setViewMode('month')}
                    >
                        <Text style={[
                            styles.toggleText,
                            viewMode === 'month' && styles.toggleTextActive
                        ]}>
                            Month
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ══════════════════════════════════════════════════════ */}
                {/* WEEK VIEW                                              */}
                {/* ══════════════════════════════════════════════════════ */}
                {viewMode === 'week' && (
                    <>
                        {/* Week Selector */}
                        <TouchableOpacity
                            style={[pills.pill, pills.pillAddonLessPadding, pills.pillColorCoralLight]}
                            onPress={() => setWeekPickerVisible(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={[pills.pillText, colorDefinition.colorPrimary]}>
                                {weekRangeLabel}
                            </Text>
                            <Text style={styles.selectorArrow}>▼</Text>
                        </TouchableOpacity>

                        {/* Emotion Radar Chart */}
                        {!weekLoading && (
                            <View style={styles.section}>
                                <Text style={sectionLabel}>Emotion Distribution</Text>
                                <View style={styles.radarWrapper}>
                                    <EmotionRadar
                                        emotionCounts={weekEmotionCounts}
                                        prominentEmotion={weekProminentEmotion}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Model Confidence Metrics */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Average Confidence</Text>
                            {weekLoading ? (
                                <View style={styles.metricsSkeleton} />
                            ) : (
                                <View style={styles.metricsRow}>
                                    {[
                                        { value: weekData?.metrics.face, color: colors.barFace, icon: '📷' },
                                        { value: weekData?.metrics.voice, color: colors.barVoice, icon: '🎙' },
                                        { value: weekData?.metrics.text, color: colors.barText, icon: '📝' },
                                    ].map((metric, i) => (
                                        <React.Fragment key={i}>
                                            <View style={styles.metricBox}>
                                                <Text style={[styles.metricValue, { color: metric.color }]}>
                                                    {metric.value}%
                                                </Text>
                                                <Text style={styles.metricIcon}>{metric.icon}</Text>
                                            </View>
                                            {i < 2 && <View style={styles.metricDivider} />}
                                        </React.Fragment>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Additional Week Stats */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{user?.streak ?? 0}</Text>
                                <Text style={styles.statLabel}>DAY STREAK</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{user?.journalCount ?? 0}</Text>
                                <Text style={styles.statLabel}>ENTRIES</Text>
                            </View>
                        </View>
                    </>
                )}

                {/* ══════════════════════════════════════════════════════ */}
                {/* MONTH VIEW                                             */}
                {/* ══════════════════════════════════════════════════════ */}
                {viewMode === 'month' && (
                    <>
                        {/* Month Selector */}
                        <TouchableOpacity
                            style={[pills.pill, pills.pillAddonLessPadding, pills.pillColorCoralLight]}
                            onPress={() => setMonthPickerVisible(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={[pills.pillText, colorDefinition.colorPrimary]}>
                                {monthLabel}
                            </Text>
                            <Text style={styles.selectorArrow}>▼</Text>
                        </TouchableOpacity>

                        {/* Emotion Calendar */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Daily Emotions</Text>
                            <EmotionCalendar
                                month={selectedMonth.getMonth()}
                                year={selectedMonth.getFullYear()}
                                dayEmotions={buildMonthEmotions(
                                    allWeekEntries,
                                    selectedMonth.getMonth(),
                                    selectedMonth.getFullYear()
                                )}
                            />
                        </View>

                        {/* Monthly Overview Placeholder */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Monthly Overview</Text>
                            <View style={styles.placeholderCard}>
                                <Text style={styles.placeholderText}>
                                    Monthly statistics coming soon...
                                </Text>
                            </View>
                        </View>
                    </>
                )}

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── Modals ──────────────────────────────────────────── */}
            <WeekPicker
                visible={weekPickerVisible}
                currentWeekStart={weekStart}
                onSelect={selectWeek}
                onClose={() => setWeekPickerVisible(false)}
            />

            <MonthPicker
                visible={monthPickerVisible}
                currentMonth={selectedMonth}
                onSelect={setSelectedMonth}
                onClose={() => setMonthPickerVisible(false)}
            />
        </SafeAreaView>
    );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background
    },
    scroll: {
        flex: 1
    },

    // Header
    header: {
        marginHorizontal: spacing.marginHorizontal,
        paddingTop: 16,
        paddingBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },

    // Toggle
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.marginHorizontal,
        marginTop: 16,
        marginBottom: 10,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleButtonActive: {
        backgroundColor: colors.primary,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    toggleTextActive: {
        color: colors.surface,
    },

    // Selector arrow
    selectorArrow: {
        fontSize: 10,
        color: colors.primary,
    },

    // Well-being card
    wellbeingCard: {
        marginHorizontal: spacing.marginHorizontal,
        marginTop: 16,
        padding: 28,
        backgroundColor: colors.surface,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    wellbeingScore: {
        fontSize: 64,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -2,
    },
    wellbeingLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.5,
    },

    // Section container
    section: {
        marginHorizontal: spacing.marginHorizontal,
        marginTop: 24,
        gap: 12,
    },

    // Radar wrapper (contains the chart)
    radarWrapper: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },

    // Metrics
    metricsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    metricBox: {
        flex: 1,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    metricDivider: {
        width: 3,
        backgroundColor: colors.background,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metricIcon: {
        fontSize: 18,
    },
    metricsSkeleton: {
        height: 80,
        backgroundColor: colors.timelineLine,
        borderRadius: 20,
    },

    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        marginHorizontal: spacing.marginHorizontal,
        marginTop: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 20,
        backgroundColor: colors.surface,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statValue: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.5,
    },

    // Placeholder
    placeholderCard: {
        padding: 40,
        backgroundColor: colors.surface,
        borderRadius: 20,
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
});