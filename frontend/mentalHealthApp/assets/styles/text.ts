import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import {colors, spacing} from "./colors";

export const sectionLabel: TextStyle = {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentDark,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
};

export const pills = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        gap: 6,
        marginTop: 10,
        borderWidth: spacing.defaultBorderWidth,
        paddingHorizontal: spacing.paddingHorizontal,
        paddingVertical: 10,
        borderRadius: 50,
        alignItems: 'center', justifyContent: 'center',
    } as ViewStyle,

    pillAddonLessPadding: {
        marginHorizontal: spacing.marginHorizontal - spacing.paddingHorizontal,
    } as ViewStyle,

    pillColorCoralFull: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    } as ViewStyle,

    pillColorCoralLight: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    } as ViewStyle,

    pillColorCoralNone: {
        backgroundColor: colors.transparent,
        borderColor: colors.primary,
    } as ViewStyle,

    pillColorLavenderFull: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    } as ViewStyle,

    pillColorLavenderLight: {
        backgroundColor: colors.accentLight,
        borderColor: colors.accent,
    } as ViewStyle,

    pillColorLavenderNone: {
        backgroundColor: colors.transparent,
        borderColor: colors.accent,
    } as ViewStyle,

    pillColorTurquoiseFull: {
        backgroundColor: colors.semantic,
        borderColor: colors.semantic,
    } as ViewStyle,

    pillColorTurquoiseLight: {
        backgroundColor: colors.semanticLight,
        borderColor: colors.semantic,
    } as ViewStyle,

    pillColorTurquoiseNone: {
        backgroundColor: colors.transparent,
        borderColor: colors.semantic,
    } as ViewStyle,

    pillText: {
        fontSize: 14,
        fontWeight: '500',
    } as TextStyle

});

export const contentGap: TextStyle = {
    gap: 12,
};