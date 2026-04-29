import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '@/assets/styles/colors';
import { MetricBar } from './MetricBar';

export interface LogEntryData {
    id: string;
    mood: string;
    score: number;
    scoreColor: string;
    dotColor: string;
    date: string;
    bars: React.ComponentProps<typeof MetricBar>['bar'][];
    journalText?: string;
    suggestion?: string;
    tip?: string;
}

export function LogEntry({ entry }: { entry: LogEntryData }) {
    const [expanded, setExpanded] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        const toVal = expanded ? 0 : 1;
        setExpanded(!expanded);
        Animated.spring(anim, { toValue: toVal, useNativeDriver: false }).start();
    };

    const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 400] });

    function parseBackendDate(dateStr: string) {
        if (!dateStr) return '';

        try {
            const cleaned = dateStr
                .replace(' ', 'T')
                .split('.')[0] + 'Z';

            const d = new Date(cleaned);

            if (isNaN(d.getTime())) return 'Invalid date';

            return d.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
        } catch {
            return 'Invalid date';
        }
    }

    return (
        <View style={styles.entryWrapper}>
            <View style={[styles.timelineDot, { backgroundColor: entry.dotColor }]} />

            <TouchableOpacity style={styles.entryCard} onPress={toggle} activeOpacity={0.9}>
                <View style={styles.entryHeader}>
                    <Text style={styles.entryMood}>{entry.mood}</Text>
                    <Text style={[styles.entryScore, { color: entry.scoreColor }]}>{entry.score}</Text>
                </View>

                <Text style={styles.entryDate}>{entry.date}</Text>

                <View style={styles.barsContainer}>
                    {entry.bars.map((b) => (
                        <MetricBar key={b.label} bar={b} />
                    ))}
                </View>

                {entry.suggestion && (
                    <View>
                        <Text style={styles.expandToggle}>{expanded ? '▲' : '▼'} your suggestions</Text>
                        <Animated.View style={[styles.journalExpand, { maxHeight, overflow: 'hidden' }]}>
                            <View style={styles.journalDivider} />
                            {/*<Text style={styles.journalLabel}>YOUR JOURNAL</Text>*/}

                            <View style={styles.suggestionBubble}>
                                <Text style={styles.suggestionQ}>Q: What would help right now?</Text>
                                <Text style={styles.suggestionA}>{entry.suggestion}</Text>
                            </View>

                            {entry.tip && (
                                <View style={styles.tipBubble}>
                                    <Text style={styles.tipIcon}>💡</Text>
                                    <Text style={styles.tipText}>{entry.tip}</Text>
                                </View>
                            )}
                        </Animated.View>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

const DEFAULTS = {
    paddingHorizontal: 16,
    paddingVertical: 16,
} as const

const styles = StyleSheet.create({
    entryWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    timelineDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginTop: 18,
        marginRight: 12,
        zIndex: 1,
    },
    entryCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingVertical: DEFAULTS.paddingVertical,
        shadowColor: colors.textSecondary,
        shadowOpacity: 0.6,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: DEFAULTS.paddingHorizontal,
    },
    entryMood: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    entryScore: { fontSize: 17, fontWeight: '800' },
    entryDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2, marginBottom: 10, paddingHorizontal: DEFAULTS.paddingHorizontal },
    barsContainer: { gap: 6, paddingHorizontal: DEFAULTS.paddingHorizontal },
    expandToggle: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 10,
    },
    journalExpand: {},
    journalDivider: {
        height: 3,
        backgroundColor: colors.background,
        marginVertical: 12,
        marginHorizontal: -160,
    },
    journalLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 1.2,
        textAlign: 'center',
        marginBottom: 6,
        paddingHorizontal: DEFAULTS.paddingHorizontal
    },
    journalQuote: {
        fontSize: 14,
        fontStyle: 'italic',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20,
        paddingHorizontal: DEFAULTS.paddingHorizontal
    },
    suggestionBubble: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.scoreMid,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        marginHorizontal: DEFAULTS.paddingHorizontal
    },
    suggestionQ: { fontSize: 11, color: colors.accent, marginBottom: 2 },
    suggestionA: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    tipBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F9F4',
        borderWidth: 2,
        borderColor: colors.scoreHigh,
        borderRadius: 14,
        padding: 12,
        gap: 8,
        marginHorizontal: DEFAULTS.paddingHorizontal
    },
    tipIcon: { fontSize: 16 },
    tipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1 },
});
