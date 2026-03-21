import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/assets/colors/colors';

export interface MetricBarData {
    label: string;
    icon: string;
    value: number;  // 0–100
    color: string;
    text: string;
}

export function MetricBar({ bar }: { bar: MetricBarData }) {
    return (
        <View style={styles.barRow}>
            <Text style={styles.barIcon}>{bar.icon}</Text>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <View style={styles.barTrack}>
                <LinearGradient
                    colors={[bar.color + '5C', bar.color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${bar.value}%` }]}
                />
            </View>
            <Text style={[styles.barText, { color: bar.color }]}>{bar.text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barIcon: { fontSize: 12, width: 16 },
    barLabel: { fontSize: 11, color: colors.textSecondary, width: 30 },
    barTrack: {
        flex: 1,
        height: 6,
        backgroundColor: colors.background,
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 3 },
    barText: { fontSize: 11, fontWeight: '600', width: 80, textAlign: 'right' },
});
