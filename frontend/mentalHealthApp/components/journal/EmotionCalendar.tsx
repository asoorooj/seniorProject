// components/journal/EmotionCalendar.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/assets/styles/colors';

const EMOTION_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
    Anger: { icon: 'sentiment-very-dissatisfied', color: '#E05C5C' },
    Sad: { icon: 'sentiment-dissatisfied', color: '#7B8FD4' },
    Fear: { icon: 'sentiment-dissatisfied', color: '#B07FD4' },
    Neutral: { icon: 'sentiment-neutral', color: '#8B87A8' },
    Disgust: { icon: 'sentiment-very-dissatisfied', color: '#A07B5A' },
    Happy: { icon: 'sentiment-satisfied', color: '#2D9C8A' },
};

interface EmotionCalendarProps {
    month?: number;  // 0-11
    year?: number;
    dayEmotions?: Record<number, string>; // day number -> emotion
}

export function EmotionCalendar({
                                    month = new Date().getMonth(),
                                    year = new Date().getFullYear(),
                                    dayEmotions = {}
                                }: EmotionCalendarProps) {

    // Calculate calendar grid
    const firstDay = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Create array including empty cells for alignment
    const calendarDays = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];

    // Group into weeks
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    const screenWidth = Dimensions.get('window').width;
    const cellSize = (screenWidth - spacing.marginHorizontal * 2 - 32 - 12) / 7; // account for padding and gaps

    return (
        <View style={styles.calendar}>
            {/* Day headers */}
            <View style={styles.weekRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <View key={i} style={[styles.headerCell, { width: cellSize }]}>
                        <Text style={styles.weekDayLabel}>{day}</Text>
                    </View>
                ))}
            </View>

            {/* Calendar grid */}
            {weeks.map((week, weekIdx) => (
                <View key={weekIdx} style={styles.weekRow}>
                    {week.map((day, dayIdx) => {
                        const emotion = day ? dayEmotions[day] : null;
                        const config = emotion ? EMOTION_CONFIG[emotion] : null;

                        return (
                            <View
                                key={dayIdx}
                                style={[
                                    styles.dayCell,
                                    { width: cellSize, height: cellSize },
                                    !day && styles.emptyCell
                                ]}
                            >
                                {day && (
                                    <>
                                        {/* Day number in top-right corner */}
                                        <Text style={styles.dayNumber}>{day}</Text>

                                        {/* Large emotion icon in center */}
                                        {config && (
                                            <MaterialIcons
                                                name={config.icon}
                                                size={cellSize * 0.5}
                                                color={config.color}
                                                style={styles.emotionIcon}
                                            />
                                        )}
                                    </>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    calendar: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
    },
    weekRow: {
        flexDirection: 'row',
        gap: 2,
    },
    headerCell: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekDayLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    dayCell: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 4,
        marginVertical: 1,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCell: {
        backgroundColor: 'transparent',
    },
    dayNumber: {
        position: 'absolute',
        top: 4,
        right: 6,
        fontSize: 10,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emotionIcon: {
        // Icon is centered by default
    },
});