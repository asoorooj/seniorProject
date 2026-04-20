import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from '@/assets/styles/colors';
import { spacing } from "@/assets/styles/colors";
import { sectionLabel } from "@/assets/styles/text";

const EMOTION_TO_MOOD: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
    Anger: { icon: 'sentiment-very-dissatisfied', color: '#E05C5C' },
    Sad: { icon: 'sentiment-dissatisfied', color: '#7B8FD4' },
    Fear: { icon: 'sentiment-dissatisfied', color: '#B07FD4' },
    Neutral: { icon: 'sentiment-neutral', color: '#8B87A8' },
    Disgust: { icon: 'sentiment-very-dissatisfied', color: '#A07B5A' },
    Happy: { icon: 'sentiment-satisfied', color: '#2D9C8A' },
};

interface EmotionRadarProps {
    emotionCounts: {
        Anger: number;
        Disgust: number;
        Fear: number;
        Happy: number;
        Neutral: number;
        Sad: number;
    };
    prominentEmotion?: string;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 70;
const LABEL_PADDING = 24;
const LABELS = ['Anger', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad'] as const;
const MIN_VALUE = 0.08;

function polarToXY(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
        x: CENTER + r * Math.cos(rad),
        y: CENTER + r * Math.sin(rad),
    };
}

export function EmotionRadar({ emotionCounts, prominentEmotion }: EmotionRadarProps) {
    const angleStep = 360 / LABELS.length;

    const maxValue = Math.max(...LABELS.map(l => emotionCounts[l] || 0), 1);

    const values = LABELS.map(l => {
        const raw = (emotionCounts[l] || 0) / maxValue;
        return raw > 0 ? Math.max(raw, MIN_VALUE) : 0;
    });

    const shapePoints = LABELS.map((_, i) => {
        const { x, y } = polarToXY(i * angleStep, values[i] * RADIUS);
        return `${x},${y}`;
    }).join(' ');

    const rings = [0.25, 0.5, 0.75, 1.0];

    return (
        <View style={styles.row}>
            {/* Left side: prominent emotion */}
            <View style={styles.emotionSide}>
                {prominentEmotion && EMOTION_TO_MOOD[prominentEmotion] && (
                    <>
                        <MaterialIcons
                            name={EMOTION_TO_MOOD[prominentEmotion].icon}
                            size={110}
                            color={EMOTION_TO_MOOD[prominentEmotion].color}
                        />
                        <Text
                            style={[
                                styles.scoreLabel,
                                { color: EMOTION_TO_MOOD[prominentEmotion].color }
                            ]}
                        >
                            {prominentEmotion.toUpperCase()}
                        </Text>
                    </>
                )}
            </View>

            {/* Radar Chart */}
            <View style={styles.radarChartSide}>
                <Svg width={SIZE} height={SIZE}>
                    {/* Rings */}
                    {rings.map((r, i) => {
                        const pts = LABELS.map((_, j) => {
                            const { x, y } = polarToXY(j * angleStep, r * RADIUS);
                            return `${x},${y}`;
                        }).join(' ');
                        return (
                            <Polygon
                                key={i}
                                points={pts}
                                fill="none"
                                stroke="#3D3870"
                                strokeWidth={1}
                                opacity={0.4}
                            />
                        );
                    })}

                    {/* Axes */}
                    {LABELS.map((_, i) => {
                        const { x, y } = polarToXY(i * angleStep, RADIUS);
                        return (
                            <Line
                                key={i}
                                x1={CENTER}
                                y1={CENTER}
                                x2={x}
                                y2={y}
                                stroke="#3D3870"
                                strokeWidth={1}
                                opacity={0.4}
                            />
                        );
                    })}

                    {/* Data shape */}
                    <Polygon
                        points={shapePoints}
                        fill={colors.primary}
                        fillOpacity={0.35}
                        stroke={colors.primary}
                        strokeWidth={2}
                    />

                    {/* Center dot */}
                    <Circle cx={CENTER} cy={CENTER} r={3} fill={colors.primary} opacity={0.6} />

                    {/* Labels */}
                    {LABELS.map((label, i) => {
                        const { x, y } = polarToXY(i * angleStep, RADIUS + LABEL_PADDING);
                        return (
                            <SvgText
                                key={label}
                                x={x}
                                y={y}
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                fontSize={11}
                                fontWeight="600"
                                fill="#8B87A8"
                            >
                                {label}
                            </SvgText>
                        );
                    })}
                </Svg>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-end', // 👈 aligns both sides to bottom
        height: SIZE,           // 👈 matches SVG height
        paddingHorizontal: spacing.paddingHorizontal,
    },
    emotionSide: {
        flex: 1,
        width: 90,
        alignItems: 'flex-start',
        justifyContent: 'flex-end', // 👈 pushes icon + label to bottom
        gap: 6,
    },
    radarChartSide: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'flex-end', // 👈 keeps SVG bottom-aligned
    },
    scoreLabel: {
        fontSize: 20,
        color: colors.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    emotionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
});