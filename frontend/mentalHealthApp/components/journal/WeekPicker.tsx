import React, {useEffect, useRef, useState} from 'react';
import {
    View, Text, TouchableOpacity, Modal,
    StyleSheet, ScrollView, Pressable, Animated,
} from 'react-native';
import { colors } from '@/assets/styles/colors';
import { getWeekStart } from '@/hooks/useJournalData';

interface WeekPickerProps {
    visible: boolean;
    currentWeekStart: Date;
    onSelect: (weekStart: Date) => void;
    onClose: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS  = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Build a grid of Date objects for a given month (padded to full weeks)
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];

    // Pad to full rows of 7
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
}

function isSameWeek(a: Date, b: Date): boolean {
    return getWeekStart(a).toDateString() === getWeekStart(b).toDateString();
}

export function WeekPicker({ visible, currentWeekStart, onSelect, onClose }: WeekPickerProps) {
    {/*
        Extremely convoluted solution to prevent the bug of the opacity
        sliding with the animation seen in our normal home screen.
        This reimplements the modal animation with similar timing
        by mounting and dimming the screen first, then sliding the modal,
        then when closing it slides the modal out again, then unmounts
    */}
    const slideAnim = useRef(new Animated.Value(600)).current;
    const [modalMounted, setModalMounted] = useState(false);

    useEffect(() => {
        if (visible) {
            // mount first
            setModalMounted(true);
            // then animate in on next frame
            setTimeout(() => {
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }).start();
            }, 10);
        } else {
            // animate out first, then unmount
            Animated.timing(slideAnim, {
                toValue: 1000,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setModalMounted(false);
                slideAnim.setValue(1000); // reset for next open
            });
        }
    }, [visible]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 600],
        outputRange: [0, 600], // 600 = offscreen below
    });

    {/*
        Actual picker code
    */}
    const today = new Date();
    // Show current month and 2 months back
    const [pivotMonth, setPivotMonth] = useState(() => ({
        year: today.getFullYear(),
        month: today.getMonth(),
    }));

    const months = [0].map(offset => {
        let m = pivotMonth.month + offset;
        let y = pivotMonth.year;
        if (m < 0)  { m += 12; y -= 1; }
        if (m > 11) { m -= 12; y += 1; }
        return { year: y, month: m };
    });

    return (
        <Modal
            visible={modalMounted}
            transparent
            animationType="none"
            onRequestClose={onClose}>
            {/* Transparent backdrop */}
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY }] }]}
                >
                    <Pressable onPress={() => {}}>
                        {/* Month navigation */}
                        <View style={styles.navRow}>
                            <TouchableOpacity onPress={() => setPivotMonth(p => {
                                let m = p.month - 1, y = p.year;
                                if (m < 0) { m = 11; y--; }
                                return { year: y, month: m };
                            })}>
                                <Text style={styles.navArrow}>‹</Text>
                            </TouchableOpacity>
                            <Text style={styles.navTitle}>
                                {MONTH_NAMES[pivotMonth.month]} {pivotMonth.year}
                            </Text>
                            <TouchableOpacity onPress={() => setPivotMonth(p => {
                                let m = p.month + 1, y = p.year;
                                if (m > 11) { m = 0; y++; }
                                return { year: y, month: m };
                            })}>
                                <Text style={styles.navArrow}>›</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {months.map(({ year, month }) => (
                                <View key={`${year}-${month}`} style={styles.monthBlock}>
                                    <Text style={styles.monthLabel}>
                                        {MONTH_NAMES[month]} {year}
                                    </Text>

                                    {/* Day-of-week header */}
                                    <View style={styles.dayHeaderRow}>
                                        {DAY_LABELS.map((l, i) => (
                                            <Text key={i} style={styles.dayHeader}>{l}</Text>
                                        ))}
                                    </View>

                                    {/* Weeks */}
                                    {buildMonthGrid(year, month).map((week, wi) => {
                                        // Find the first real date in the row to determine the week
                                        const firstDate = week.find(d => d !== null) as Date;
                                        const weekSun = getWeekStart(firstDate);
                                        const isSelected = isSameWeek(weekSun, currentWeekStart);

                                        return (
                                            <TouchableOpacity
                                                key={wi}
                                                style={[styles.weekRow, isSelected && styles.weekRowSelected]}
                                                onPress={() => { onSelect(weekSun); onClose(); }}
                                                activeOpacity={0.7}
                                            >
                                                {week.map((date, di) => {
                                                    const isToday = date?.toDateString() === today.toDateString();
                                                    return (
                                                        <View key={di} style={styles.dayCell}>
                                                            {date ? (
                                                                <Text style={[
                                                                    styles.dayText,
                                                                    isSelected && styles.dayTextSelected,
                                                                    isToday && styles.dayTextToday,
                                                                ]}>
                                                                    {date.getDate()}
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                    );
                                                })}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>Done</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(30, 24, 48, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 36,
        maxHeight: '80%',
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    navArrow: { fontSize: 26, color: colors.accent, paddingHorizontal: 8 },
    navTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    monthBlock: { marginBottom: 24 },
    monthLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    dayHeaderRow: { flexDirection: 'row', marginBottom: 4 },
    dayHeader: {
        flex: 1, textAlign: 'center',
        fontSize: 11, fontWeight: '600',
        color: colors.textSecondary,
    },
    weekRow: {
        flexDirection: 'row',
        borderRadius: 10,
        marginVertical: 1,
    },
    weekRowSelected: {
        backgroundColor: colors.accent + '22',
    },
    dayCell: {
        flex: 1, height: 36,
        alignItems: 'center', justifyContent: 'center',
    },
    dayText: { fontSize: 14, color: colors.textPrimary },
    dayTextSelected: { color: colors.accent, fontWeight: '700' },
    dayTextToday: {
        color: colors.primary,
        fontWeight: '800',
    },
    closeBtn: {
        marginTop: 12,
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
