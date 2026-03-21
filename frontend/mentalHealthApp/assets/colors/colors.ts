export const palette = {
    coral:      '#F27059', // Primary / Call to Action
    lavender:   '#9B8FE8', // Accent
    midnight:   '#1E1830', // Neutral Dark / Text
    mist:       '#F8F5FF', // Neutral Light / Background
    turquoise:  '#4CC9B0', // Semantic
} as const;

export const colors = {

    // Backgrounds
    background:       palette.mist,       // Main screen background
    surface:          '#FFFFFF',          // Cards, modals, elevated surfaces

    // Text
    textPrimary:      palette.midnight,   // Main body text, headings
    textSecondary:    '#AAA4C0',          // Muted labels, dates, subtitles

    // Brand / Actions
    primary:          palette.coral,      // Buttons, CTAs, highlights
    primaryLight:     '#EFBAAE',          // 50% Light tint of coral (used in add button background)
    accent:           palette.lavender,   // Selected state, active tabs, accents
    accentLight:      '#E4E2F6',          // 50% Light tint of lavender
    semantic:         palette.turquoise,  // Semantic
    semanticLight:    '#D8F0EA',          // 50% Light tint of turquoise

    // Emotion scores & metric bars
    scoreHigh:        palette.turquoise,  // High score
    scoreMid:         palette.lavender,   // Mid score
    scoreLow:         palette.coral,      // Low score

    // Metric bar colors (Face / Voice / Text)
    barFace:          palette.lavender,   // Purple — facial expression confidence
    barVoice:         palette.coral,      // Coral — voice tone confidence
    barText:          palette.turquoise,  // Turquoise — text sentiment confidence

    // Timeline
    timelineLine:     '#E8E4F4',          // Vertical line in log in journal

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