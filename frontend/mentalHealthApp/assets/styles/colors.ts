import { StyleSheet, TextStyle } from 'react-native';

export const palette = {
    coral:      '#F27059', // Primary / Call to Action
    lavender:   '#9B8FE8', // Accent
    midnight:   '#1E1830', // Neutral Dark / Text
    mist:       '#F8F5FF', // Neutral Light / Background
    turquoise:  '#4CC9B0', // Semantic
} as const;

export const colorDefinition = StyleSheet.create({
    colorPrimary: {
        color: palette.coral
    } as TextStyle,

    colorAccent: {
        color: palette.lavender
    } as TextStyle,

    colorSemantic: {
        color: palette.turquoise
    }
});

export const colors = {

    // Backgrounds
    background:       palette.mist,       // Main screen background
    surface:          '#FFFFFF',          // Cards, modals, elevated surfaces
    transparent:      'transparent',

    // Text
    textPrimary:      palette.midnight,   // Main body text, headings
    textSecondary:    '#AAA4C0',          // Muted labels, dates, subtitles

    // Brand / Actions
    primary:          palette.coral,      // Buttons, CTAs, highlights
    primaryLight:     '#F7DCD6',          // 25% Light tint of coral (used in add button background)
    accent:           palette.lavender,   // Selected state, active tabs, accents
    accentDark:       '#9E8FB8',          // Darker lavender palette
    accentLight:      '#F9F8FE',          // 25% Light tint of lavender
    semantic:         palette.turquoise,  // Semantic
    semanticLight:    '#F6FCF9',          // 50% Light tint of turquoise

    // Emotion scores & metric bars
    scoreHigh:        palette.turquoise,  // High score
    scoreMid:         palette.lavender,   // Mid score
    scoreLow:         palette.coral,      // Low score

    // Metric bar colors (Face / Voice / Text)
    barFace:          palette.lavender,   // Purple — facial expression confidence
    barVoice:         palette.coral,      // Coral — voice tone confidence
    barText:          palette.turquoise,  // Turquoise — text sentiment confidence

    // Timeline
    timelineLine:     '#C5BDE8',          // Vertical line in log in journal

    // Chart
    sparkline:        palette.coral,      // Line color in the well-being chart
    sparklineDot:     palette.coral,      // Highlighted point on chart
    weekLabelActive:  palette.coral,      // Current day label on chart

    // Borders (Not really used atm because mockup border colors are the standard colors)
    borderCoral:      '#C94D35',  // coral darkened
    borderTurquoise:  '#2A9B82',  // turquoise darkened
    borderLavender:   '#6B5EC4',  // lavender darkened
    borderMist:       '#B8B0D4',  // mist darkened

} as const;

export const spacing = {

    paddingHorizontal: 12,
    marginHorizontal: 24,
    defaultBorderWidth: 1.5

} as const;

export const capsule = {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.textSecondary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    padding: 20,
} as const;

export const fonts = {

} as const;