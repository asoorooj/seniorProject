import React from 'react';
import Svg, { Polyline, Circle, Defs, Filter, FeDropShadow } from 'react-native-svg';
import { colors } from '@/assets/styles/colors';

interface SparklineProps {
    points: number[];
    activeIndex?: number; // which dot to highlight, defaults to 0
}

export function Sparkline({ points, activeIndex = 0 }: SparklineProps) {
    const W = 180;
    const H = 80;
    const pad = 8;

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    const coords = points.map((v, i) => {
        const x = pad + (i / (points.length - 1)) * (W - pad * 2);
        const y = pad + ((max - v) / range) * (H - pad * 2);
        return `${x},${y}`;
    });

    const hx = pad + (activeIndex / (points.length - 1)) * (W - pad * 2);
    const hy = pad + ((max - points[activeIndex]) / range) * (H - pad * 2);

    return (
        <Svg width={W} height={H}>
            <Defs>
                <Filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <FeDropShadow dx="0" dy="2" stdDeviation="3" floodColor={colors.sparkline} />
                </Filter>
            </Defs>
            <Polyline
                points={coords.join(' ')}
                fill="none"
                stroke={colors.sparkline}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#shadow)"
            />
            <Circle cx={hx} cy={hy} r={5} fill={colors.sparklineDot} filter="url(#shadow)" />
        </Svg>
    );
}
