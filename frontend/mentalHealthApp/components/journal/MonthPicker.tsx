// components/journal/MonthPicker.tsx
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { colors, spacing } from '@/assets/styles/colors';

interface MonthPickerProps {
    visible: boolean;
    currentMonth: Date;
    onSelect: (date: Date) => void;
    onClose: () => void;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function MonthPicker({ visible, currentMonth, onSelect, onClose }: MonthPickerProps) {
    const [selectedYear, setSelectedYear] = useState(currentMonth.getFullYear());

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(selectedYear, monthIndex, 1);
        onSelect(newDate);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Month</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Year selector */}
                    <View style={styles.yearRow}>
                        {years.map(year => (
                            <TouchableOpacity
                                key={year}
                                style={[
                                    styles.yearButton,
                                    selectedYear === year && styles.yearButtonActive
                                ]}
                                onPress={() => setSelectedYear(year)}
                            >
                                <Text style={[
                                    styles.yearText,
                                    selectedYear === year && styles.yearTextActive
                                ]}>
                                    {year}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Month grid */}
                    <ScrollView style={styles.monthScroll}>
                        <View style={styles.monthGrid}>
                            {MONTHS.map((month, idx) => {
                                const isCurrentMonth =
                                    idx === currentMonth.getMonth() &&
                                    selectedYear === currentMonth.getFullYear();

                                return (
                                    <TouchableOpacity
                                        key={month}
                                        style={[
                                            styles.monthButton,
                                            isCurrentMonth && styles.monthButtonActive
                                        ]}
                                        onPress={() => handleMonthSelect(idx)}
                                    >
                                        <Text style={[
                                            styles.monthText,
                                            isCurrentMonth && styles.monthTextActive
                                        ]}>
                                            {month}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.marginHorizontal,
        borderBottomWidth: 1,
        borderBottomColor: colors.timelineLine,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 20,
        color: colors.textSecondary,
    },
    yearRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: spacing.marginHorizontal,
        borderBottomWidth: 1,
        borderBottomColor: colors.timelineLine,
    },
    yearButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    yearButtonActive: {
        backgroundColor: colors.primary,
    },
    yearText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    yearTextActive: {
        color: colors.surface,
    },
    monthScroll: {
        maxHeight: 400,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: spacing.marginHorizontal,
        gap: 12,
    },
    monthButton: {
        width: '30%',
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        alignItems: 'center',
    },
    monthButtonActive: {
        backgroundColor: colors.primary,
    },
    monthText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    monthTextActive: {
        color: colors.surface,
    },
});