import { useState, useEffect, useCallback, useRef } from 'react';
import { colors } from '@/assets/styles/colors';
import { LogEntryData } from '@/components/journal/LogEntry';
import {
    RawEntry,
    getEntriesForRange,
} from '@/services/repositories/journalRepository';
import { fetchEvaluationsByDate } from '@/services/apiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayDataArr {
    date: string;
    label: string;
    displayDate: string;
    score: number;
}

export interface WeekData {
    weekScore: number;
    sparklinePoints: number[];
    days: DayDataArr[];
    metrics: {
        face: number;
        voice: number;
        text: number;
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
}

function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function normalizeMood(mood: string) {
    return mood.replace(/_/g, ' ').toLowerCase();
}





const mapMoodToRadar = (mood: string) => {
    const m = mood.toLowerCase();

    if (m.includes('happy')) return 'Happy';
    if (m.includes('sad')) return 'Sad';
    if (m.includes('fear')) return 'Fear';
    if (m.includes('anger')) return 'Anger';
    if (m.includes('disgust')) return 'Disgust';
    return 'Neutral';
};

function getEmotionStats(entries: RawEntry[]) {
    const counts = {
        Anger: 0,
        Disgust: 0,
        Fear: 0,
        Happy: 0,
        Neutral: 0,
        Sad: 0,
    };

    for (const entry of entries) {
        const key = mapMoodToRadar(entry.mood ?? 'neutral');
        counts[key]++;
    }

    let prominentEmotion: keyof typeof counts = 'Neutral';
    let max = 0;

    for (const [emotion, count] of Object.entries(counts)) {
        if (count > max) {
            max = count;
            prominentEmotion = emotion as keyof typeof counts;
        }
    }

    return { counts, prominentEmotion };
}

function buildWeekData(weekStart: Date, allEntries: RawEntry[]): WeekData {
    const byDay: Record<string, RawEntry[]> = {};

    for (const entry of allEntries) {
        const date = entry.timestamp.split('T')[0];
        if (!byDay[date]) byDay[date] = [];
        byDay[date].push(entry);
    }

    const days: DayDataArr[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);

        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = byDay[dateStr] ?? [];

        const score = avg(dayEntries.map(e => e.score));

        return {
            date: dateStr,
            label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
            displayDate: d.toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit'
            }).toUpperCase(),
            score,
        };
    });

    const sparklinePoints = days.map(d => d.score);

    const weekScore = avg(sparklinePoints.filter(s => s > 0));

    const metrics = {
        face: avg(allEntries.map(e => e.face.score)),
        voice: avg(allEntries.map(e => e.voice.score)),
        text: avg(allEntries.map(e => e.text.score)),
    };

    return { weekScore, sparklinePoints, days, metrics };
}

// ─── Transform ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
    if (score >= 70) return colors.scoreHigh;
    if (score >= 50) return colors.scoreMid;
    return colors.scoreLow;
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).toUpperCase();
}

function transformEntry(raw: RawEntry): LogEntryData {
    const scoreColor = getScoreColor(raw.score);
    const mood = raw.mood ?? 'unknown';

    return {
        id: raw.id,
        mood: mood.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        score: raw.score,
        scoreColor,
        dotColor: scoreColor,
        date: formatTimestamp(raw.timestamp),
        bars: [
            {
                label: 'Face',
                icon: '📷',
                value: raw.face.score,
                color: colors.barFace,
                text: `${capitalize(raw.face.label)} ${raw.face.score}%`
            },
            {
                label: 'Voice',
                icon: '🎙',
                value: raw.voice.score,
                color: colors.barVoice,
                text: `${capitalize(raw.voice.label)} ${raw.voice.score}%`
            },
            {
                label: 'Text',
                icon: '📝',
                value: raw.text.score,
                color: colors.barText,
                text: `${capitalize(raw.text.label)} ${raw.text.score}%`
            },
        ],
        journalText: raw.journal_text ?? undefined,
        suggestion: raw.suggestion ?? undefined,
        tip: raw.tip ?? undefined,
    };
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJournalData() {
    const today = new Date();

    const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => today.getDay());

    const [weekData, setWeekData] = useState<WeekData | null>(null);
    const [allWeekEntries, setAllWeekEntries] = useState<RawEntry[]>([]);
    const [entries, setEntries] = useState<LogEntryData[]>([]);

    const [weekEmotionCounts, setWeekEmotionCounts] = useState<Record<string, number>>({});
    const [weekProminentEmotion, setWeekProminentEmotion] = useState<string>('unknown');

    const [weekLoading, setWeekLoading] = useState(true);
    const [dayLoading, setDayLoading] = useState(false);

    const loadedWeeksRef = useRef<Record<string, RawEntry[]>>({});
    const noDataWeeksRef = useRef<Record<string, boolean>>({});

    const getWeekKey = (date: Date) =>
        getWeekStart(date).toISOString().split('T')[0];

    const weekStartDateString = (date: Date) => {
        const d = getWeekStart(date);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    };

    const maxScore = (scores: Record<string, unknown> | null | undefined) => {
        if (!scores) return 0;
        const vals = Object.entries(scores).filter(([k]) => k !== '_raw_label');
        if (!vals.length) return 0;
        return Math.round(Math.max(...vals.map(([, v]) => Number(v) || 0)) * 100);
    };

    const mapEvaluationsToRawEntries = (data: any): RawEntry[] => {
        if (!data?.evaluations) return [];

        return data.evaluations.map((entry: any) => ({
            id: entry.evaluation.id,
            timestamp: entry.evaluation.timestamp,
            mood: entry.evaluation.label ?? 'unknown',
            score: maxScore(entry.evaluation.scores),
            face: {
                score: maxScore(entry.image?.scores),
                label: entry.image?.label ?? 'unknown',
            },
            voice: {
                score: maxScore(entry.audio?.scores),
                label: entry.audio?.label ?? 'unknown',
            },
            text: {
                score: maxScore(entry.text?.scores),
                label: entry.text?.label ?? 'unknown',
            },
            journal_text: entry.evaluation.journal_text ?? null,
            suggestion: entry.evaluation.suggestion ?? null,
            tip: entry.evaluation.tip ?? null,
        }));
    };

    useEffect(() => {
        let cancelled = false;
        setWeekLoading(true);

        const run = async () => {
            const weekKey = getWeekKey(weekStart);
            const { start, end } = getWeekRange(weekStart);

            let rawEntries: RawEntry[] = [];

            if (loadedWeeksRef.current[weekKey]) {
                rawEntries = loadedWeeksRef.current[weekKey];
            } else {
                const local = await getEntriesForRange({ start, end });

                if (local.length > 0) {
                    rawEntries = local;
                } else {
                    const data = await fetchEvaluationsByDate({
                        userId: 1,
                        startDate: weekStartDateString(weekStart),
                    });

                    rawEntries = mapEvaluationsToRawEntries(data);
                    loadedWeeksRef.current[weekKey] = rawEntries;
                }
            }

            if (cancelled) return;

            const derived = buildWeekData(weekStart, rawEntries);
            const { counts, prominentEmotion } = getEmotionStats(rawEntries);

            setAllWeekEntries(rawEntries);
            setWeekData(derived);
            setWeekEmotionCounts(counts);
            setWeekProminentEmotion(prominentEmotion);
            setWeekLoading(false);
        };

        run();
        return () => { cancelled = true; };
    }, [weekStart]);

    useEffect(() => {
        if (!weekData) return;

        const targetDate = weekData.days[selectedDayIndex]?.date;
        if (!targetDate) return;

        setDayLoading(true);

        const dayEntries = allWeekEntries
            .filter(e => e.timestamp.startsWith(targetDate))
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
            .map(transformEntry);

        setEntries(dayEntries);
        setDayLoading(false);
    }, [weekData, selectedDayIndex, allWeekEntries]);

    const selectDay = useCallback((i: number) => setSelectedDayIndex(i), []);
    const selectWeek = useCallback((d: Date) => {
        setWeekStart(d);
        setSelectedDayIndex(0);
    }, []);

    return {
        weekStart,
        weekData,
        entries,
        selectedDayIndex,
        weekLoading,
        dayLoading,
        weekEmotionCounts,
        weekProminentEmotion,
        allWeekEntries,
        selectDay,
        selectWeek,
    };
}