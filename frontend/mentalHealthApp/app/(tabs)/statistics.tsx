// app/(tabs)/statistics.tsx
import React, { useState, useEffect } from 'react';
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

export default function StatisticsScreen() {
    const [weekPickerVisible, setWeekPickerVisible] = useState(false);
    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const {
        weekStart,
        weekData,
        weekLoading,
        weekEmotionCounts,
        weekProminentEmotion,
        selectWeek,
        allWeekEntries,
        monthEntries,
        monthLoading,
        fetchMonthData,
    } = useJournalData();

    // Fetch month data when month changes
    useEffect(() => {
        if (viewMode === 'month') {
            fetchMonthData(selectedMonth);
        }
    }, [selectedMonth, viewMode, fetchMonthData]);

    const weekRangeLabel = weekData
        ? `${weekData.days[0].displayDate}  —  ${weekData.days[6].displayDate}`
        : '...';

    const monthLabel = selectedMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    }).toUpperCase();

    // Helper functions
    const mapMoodToCalendar = (mood: string) => {
        const m = mood.toLowerCase();
        if (m.includes('happy')) return 'Happy';
        if (m.includes('sad')) return 'Sad';
        if (m.includes('fear')) return 'Fear';
        if (m.includes('anger')) return 'Anger';
        if (m.includes('disgust')) return 'Disgust';
        return 'Neutral';
    };

    const buildMonthEmotions = (entries: any[], month: number, year: number) => {
        const result: Record<number, string> = {};

        for (const entry of entries) {
            const date = new Date(entry.timestamp);
            if (date.getMonth() !== month || date.getFullYear() !== year) continue;

            const day = date.getDate();
            result[day] = mapMoodToCalendar(entry.mood ?? 'neutral');
        }

        return result;
    };

    // Statistics calculations
    const getStreak = (entries: any[]) => {
        if (!entries.length) return 0;

        const days = new Set(
            entries.map(e => new Date(e.timestamp).toLocaleDateString('en-CA'))
        );

        let streak = 0;
        let current = new Date();

        while (true) {
            const d = current.toLocaleDateString('en-CA');
            if (days.has(d)) {
                streak++;
                current.setDate(current.getDate() - 1);
            } else break;
        }

        return streak;
    };

    const getMostActiveHour = (entries: any[]) => {
        if (!entries.length) return '--';

        const counts: Record<number, number> = {};

        entries.forEach(e => {
            const d = new Date(e.timestamp);
            const h = d.getHours();
            counts[h] = (counts[h] || 0) + 1;
        });

        const bestHour = Number(
            Object.keys(counts).reduce((a, b) =>
                counts[Number(a)] > counts[Number(b)] ? a : b
            )
        );

        const suffix = bestHour >= 12 ? 'PM' : 'AM';
        const display = ((bestHour + 11) % 12 + 1);

        return `${display}:00 ${suffix}`;
    };

    const getAverageScore = (entries: any[]) => {
        if (!entries.length) return 0;
        const sum = entries.reduce((acc, e) => acc + (e.score || 0), 0);
        return Math.round(sum / entries.length);
    };

    const getTrendDirection = (entries: any[]) => {
        if (entries.length < 2) return 'stable';

        const sorted = [...entries].sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp)
        );

        const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
        const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

        const avgFirst = getAverageScore(firstHalf);
        const avgSecond = getAverageScore(secondHalf);

        const diff = avgSecond - avgFirst;

        if (diff > 5) return 'improving';
        if (diff < -5) return 'declining';
        return 'stable';
    };

    const getMostCommonEmotion = (entries: any[]) => {
        if (!entries.length) return 'None';

        const counts: Record<string, number> = {};

        entries.forEach(e => {
            const emotion = mapMoodToCalendar(e.mood ?? 'neutral');
            counts[emotion] = (counts[emotion] || 0) + 1;
        });

        return Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b
        );
    };

    const getModelAccuracy = (entries: any[]) => {
        if (!entries.length) return { face: 0, voice: 0, text: 0 };

        const sum = { face: 0, voice: 0, text: 0 };

        entries.forEach(e => {
            sum.face += e.face?.score || 0;
            sum.voice += e.voice?.score || 0;
            sum.text += e.text?.score || 0;
        });

        return {
            face: Math.round(sum.face / entries.length),
            voice: Math.round(sum.voice / entries.length),
            text: Math.round(sum.text / entries.length),
        };
    };

    const currentEntries = viewMode === 'week' ? allWeekEntries : monthEntries;
    const isLoading = viewMode === 'week' ? weekLoading : monthLoading;

    const streak = getStreak(currentEntries);
    const mostActiveHour = getMostActiveHour(currentEntries);
    const avgScore = getAverageScore(currentEntries);
    const trend = getTrendDirection(currentEntries);
    const mostCommon = getMostCommonEmotion(currentEntries);
    const modelAccuracy = getModelAccuracy(currentEntries);

    const trendEmoji = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';
    const trendText = trend === 'improving' ? 'improving' : trend === 'declining' ? 'declining' : 'stable';

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Header ───────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Statistics</Text>
                </View>

                {/* ── View Toggle ──────────────────────────────────────── */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
                        onPress={() => setViewMode('week')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
                            Week
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'month' && styles.toggleButtonActive]}
                        onPress={() => setViewMode('month')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>
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

                        {/* Weekly Overview Card */}
                        <View style={styles.overviewCard}>
                            <View style={styles.overviewRow}>
                                <View style={styles.overviewDivider} />
                                <View style={styles.overviewStat}>
                                    <Text style={styles.overviewValue}>{currentEntries.length}</Text>
                                    <Text style={styles.overviewLabel}>ENTRIES</Text>
                                </View>
                                <View style={styles.overviewDivider} />
                                <View style={styles.overviewStat}>
                                    <Text style={styles.overviewValue}>{streak}</Text>
                                    <Text style={styles.overviewLabel}>STREAK</Text>
                                </View>
                            </View>
                        </View>

                        {/* Emotion Radar */}
                        {!isLoading && (
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

                        {/* Model Confidence */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Model Confidence</Text>
                            {isLoading ? (
                                <View style={styles.metricsSkeleton} />
                            ) : (
                                <View style={styles.metricsRow}>
                                    {[
                                        { value: weekData?.metrics.face, color: colors.barFace, icon: '📷', label: 'Face' },
                                        { value: weekData?.metrics.voice, color: colors.barVoice, icon: '🎙', label: 'Voice' },
                                        { value: weekData?.metrics.text, color: colors.barText, icon: '📝', label: 'Text' },
                                    ].map((metric, i) => (
                                        <React.Fragment key={i}>
                                            <View style={styles.metricBox}>
                                                <Text style={[styles.metricValue, { color: metric.color }]}>
                                                    {metric.value}%
                                                </Text>
                                                <Text style={styles.metricIcon}>{metric.icon}</Text>
                                                <Text style={styles.metricLabel}>{metric.label}</Text>
                                            </View>
                                            {i < 2 && <View style={styles.metricDivider} />}
                                        </React.Fragment>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Insights */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Insights</Text>

                            {/* Trend */}
                            <View style={styles.insightCard}>
                                <Text style={styles.insightEmoji}>{trendEmoji}</Text>
                                <View style={styles.insightText}>
                                    <Text style={styles.insightTitle}>Mood Trend</Text>
                                    <Text style={styles.insightDescription}>
                                        Your mood has been <Text style={styles.highlight}>{trendText}</Text> this week
                                    </Text>
                                </View>
                            </View>

                            {/* Most Common Emotion */}
                            <View style={styles.insightCard}>
                                <Text style={styles.insightEmoji}>😊</Text>
                                <View style={styles.insightText}>
                                    <Text style={styles.insightTitle}>Most Common</Text>
                                    <Text style={styles.insightDescription}>
                                        You felt <Text style={styles.highlight}>{mostCommon}</Text> most often
                                    </Text>
                                </View>
                            </View>

                            {/* Peak Activity */}
                            <View style={styles.insightCard}>
                                <Text style={styles.insightEmoji}>⏰</Text>
                                <View style={styles.insightText}>
                                    <Text style={styles.insightTitle}>Peak Activity</Text>
                                    <Text style={styles.insightDescription}>
                                        You're most active around <Text style={styles.highlight}>{mostActiveHour}</Text>
                                    </Text>
                                </View>
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

                        {/* Monthly Overview */}
                        <View style={styles.overviewCard}>
                            <View style={styles.overviewRow}>
                                <View style={styles.overviewDivider} />
                                <View style={styles.overviewStat}>
                                    <Text style={styles.overviewValue}>{monthEntries.length}</Text>
                                    <Text style={styles.overviewLabel}>ENTRIES</Text>
                                </View>
                                <View style={styles.overviewDivider} />
                                <View style={styles.overviewStat}>
                                    <Text style={styles.overviewValue}>{mostCommon}</Text>
                                    <Text style={styles.overviewLabel}>MOST COMMON</Text>
                                </View>
                            </View>
                        </View>

                        {/* Emotion Calendar */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Daily Emotions</Text>
                            {monthLoading ? (
                                <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
                            ) : (
                                <EmotionCalendar
                                    month={selectedMonth.getMonth()}
                                    year={selectedMonth.getFullYear()}
                                    dayEmotions={buildMonthEmotions(
                                        monthEntries,
                                        selectedMonth.getMonth(),
                                        selectedMonth.getFullYear()
                                    )}
                                />
                            )}
                        </View>

                        {/* Monthly Model Performance */}
                        <View style={styles.section}>
                            <Text style={sectionLabel}>Model Performance</Text>
                            <View style={styles.performanceGrid}>
                                <View style={styles.performanceCard}>
                                    <Text style={[styles.performanceValue, { color: colors.barFace }]}>
                                        {modelAccuracy.face}%
                                    </Text>
                                    <Text style={styles.performanceLabel}>Face</Text>
                                </View>
                                <View style={styles.performanceCard}>
                                    <Text style={[styles.performanceValue, { color: colors.barVoice }]}>
                                        {modelAccuracy.voice}%
                                    </Text>
                                    <Text style={styles.performanceLabel}>Voice</Text>
                                </View>
                                <View style={styles.performanceCard}>
                                    <Text style={[styles.performanceValue, { color: colors.barText }]}>
                                        {modelAccuracy.text}%
                                    </Text>
                                    <Text style={styles.performanceLabel}>Text</Text>
                                </View>
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
    safeArea: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },

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

    selectorArrow: {
        fontSize: 10,
        color: colors.primary,
    },

    // Overview Card
    overviewCard: {
        marginHorizontal: spacing.marginHorizontal,
        marginTop: 16,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    overviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    overviewStat: {
        flex: 1,
        alignItems: 'center',
    },
    overviewValue: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    overviewLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    overviewDivider: {
        width: 2,
        height: 40,
        backgroundColor: colors.background,
    },

    section: {
        marginHorizontal: spacing.marginHorizontal,
        marginTop: 24,
        gap: 12,
    },

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
        gap: 4,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metricIcon: {
        fontSize: 16,
    },
    metricLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 4,
    },
    metricDivider: {
        width: 3,
        backgroundColor: colors.background,
    },
    metricsSkeleton: {
        height: 80,
        backgroundColor: colors.timelineLine,
        borderRadius: 20,
    },

    // Insights
    insightCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    insightEmoji: {
        fontSize: 32,
    },
    insightText: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    insightDescription: {
        fontSize: 14,
        color: colors.textPrimary,
        lineHeight: 20,
    },
    highlight: {
        fontWeight: '700',
        color: colors.primary,
    },

    // Performance Grid
    performanceGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    performanceCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    performanceValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    performanceLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '600',
        marginTop: 4,
    },
});