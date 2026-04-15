import { useState, useEffect, useCallback, useRef } from 'react';
import { colors } from '@/assets/styles/colors';
import { LogEntryData } from '@/components/journal/LogEntry';
import {
    RawEntry,
    getEntriesForRange,
} from '@/services/repositories/journalRepository';
import { syncJournalWeek } from '@/services/sync/syncController';
import { fetchEvaluationsByDate } from '@/services/apiService';
import { TEST_USER } from '@/components/userTest';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayDataArr {
    // T split [0] ISO date e.g. "2025-03-15"
    date: string;
    // "S" | "M" | "T" | "W" | "T" | "F" | "S"
    label: string;
    // "MAR 15"
    displayDate: string;
    // Average of all entry scores for this day (0 if no entries)
    score: number;
}

export interface WeekData {
    // Average of all 7 daily scores
    weekScore: number;
    // The 7 daily scores in order
    sparklinePoints: number[];
    // Full day metadata + score, index 0 = Sunday
    days: DayDataArr[];
    metrics: {
        // Week average of face scores across all entries
        face: number;
        // Week average of voice scores
        voice: number;
        // Week average of text scores
        text: number;
    };
}

{/*
    Raw data from the API, it should return something like this, but if not, the code
    here needs to change. This is the footprint for every journal entry
*/}

{/*
    Hard-coded dummy data, please replace this with a proper API call
    e.g. fetch(`/api/journal?from=${from}&to=${to}')
    it would return an array of days with an array of entries in those days
    the data needed in those entries would look something like this according to the mockup
    but we can change if needed
*/}

function getWeekRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
}

{/*
    These functions are here for math / data processing reasons
    These *shouldn't* need to change after removing dummy data, but
    we should test edgecases with the real data just to make sure
    these functions will still work
*/}

function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function buildWeekData(weekStart: Date, allEntries: RawEntry[]): WeekData {
    // Build a map of date string → entries for that day
    const byDay: Record<string, RawEntry[]> = {};
    for (const entry of allEntries) {
        const date = entry.timestamp.split('T')[0];
        if (!byDay[date]) byDay[date] = [];
        byDay[date].push(entry);
    }

    {/*
        Build the 7 DayDataArr objects, one per day starting from weekStart
        DayDataArr[] contains ISO date values, Week day labels, date to display to our app
        and avg emotion score that day (based on all entries from that day averaged out)
    */}
    const days: DayDataArr[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = byDay[dateStr] ?? [];

        // Daily score = average of all entry scores for this day
        const score = avg(dayEntries.map(e => e.score));

        return {
            date: dateStr,
            label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
            displayDate: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
            score,
        };
    });

    // Sparkline = the 7 daily scores in order
    const sparklinePoints = days.map(dayData => dayData.score);

    // Weekly score = average of the 7 daily scores
    const weekScore = avg(sparklinePoints.filter(score => score > 0)); // exclude empty days

    // Model metric card accuracy values = week-wide averages per modality
    const metrics = {
        face:  avg(allEntries.map(journalEntry => journalEntry.face.score)),
        voice: avg(allEntries.map(journalEntry => journalEntry.voice.score)),
        text:  avg(allEntries.map(journalEntry => journalEntry.text.score)),
    };

    return { weekScore, sparklinePoints, days, metrics };
}

// ─── Transform: RawEntry → LogEntryData (UI shape) ───────────────────────────

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
        month: 'short', day: '2-digit',
        hour: 'numeric', minute: '2-digit', hour12: true,
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
            { label: 'Face',  icon: '📷', value: raw.face.score,  color: colors.barFace,  text: `${capitalize(raw.face.label)} ${raw.face.score}%` },
            { label: 'Voice', icon: '🎙', value: raw.voice.score, color: colors.barVoice, text: `${capitalize(raw.voice.label)} ${raw.voice.score}%` },
            { label: 'Text',  icon: '📝', value: raw.text.score,  color: colors.barText,  text: `${capitalize(raw.text.label)} ${raw.text.score}%` },
        ],
        journalText: raw.journal_text ?? undefined,
        suggestion:  raw.suggestion ?? undefined,
        tip:         raw.tip ?? undefined,
    };
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // roll back to Sunday
    d.setHours(0, 0, 0, 0);
    return d;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJournalData() {
    const today = new Date();

    const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => today.getDay());

    const [weekData, setWeekData]   = useState<WeekData | null>(null);
    const [allWeekEntries, setAllWeekEntries] = useState<RawEntry[]>([]);
    const [entries, setEntries]     = useState<LogEntryData[]>([]);
    const [weekLoading, setWeekLoading] = useState(true);
    const [dayLoading, setDayLoading]   = useState(false);
    const loadedWeeksRef = useRef<Record<string, RawEntry[]>>({});
    const noDataWeeksRef = useRef<Record<string, boolean>>({});

    const getWeekKey = (date: Date) => {
        const weekStart = getWeekStart(date);
        return weekStart.toISOString().split('T')[0];
    };

    const weekStartDateString = (date: Date) => {
        const d = getWeekStart(date);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    };

    const maxScore = (scores: Record<string, unknown> | null | undefined): number => {
        if (!scores) return 0;
        const entries = Object.entries(scores).filter(([k]) => k !== '_raw_label');
        if (entries.length === 0) return 0;
        const maxVal = Math.max(...entries.map(([, v]) => Number(v) || 0));
        return Math.round(maxVal * 100);
    };

    const mapEvaluationsToRawEntries = (data: any): RawEntry[] => {
        if (!data?.evaluations) return [];
        return data.evaluations.map((entry: any) => {
            return {
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
            };
        });
    };

    const isWeekInCache = (date: Date) => {
        const currentWeekStart = getWeekStart(new Date());
        const cutoff = new Date(currentWeekStart);
        cutoff.setDate(cutoff.getDate() - 7 * 7);
        const target = getWeekStart(date);
        return target >= cutoff;
    };

    // When the week changes: fetch all entries, then derive WeekData from them
    useEffect(() => {
        let cancelled = false;
        setWeekLoading(true);

        const run = async () => {
            const weekKey = getWeekKey(weekStart);
            const { start, end } = getWeekRange(getWeekStart(weekStart));
            let rawEntries: RawEntry[] = [];

            if (loadedWeeksRef.current[weekKey]) {
                rawEntries = loadedWeeksRef.current[weekKey];
            } else {
                let localWeekEntries = await getEntriesForRange({ start, end });
                // if (localWeekEntries.length > 0) { //LOCAL DB NOT WORKING RN USING SERVER DB
                //     rawEntries = localWeekEntries;
                // } else if (noDataWeeksRef.current[weekKey]) {
                //     rawEntries = [];
                // } else if (isWeekInCache(weekStart)) {
                //     localWeekEntries = await getEntriesForRange({ start, end });
                //     if (localWeekEntries.length === 0) {
                //         // For cached weeks, we don't fetch from API; mark empty and move on.
                //         noDataWeeksRef.current[weekKey] = true;
                //         console.log("[journal] week_cached_empty", { weekKey });
                //         rawEntries = [];
                //     } else {
                //         rawEntries = localWeekEntries;
                //     }
                // } else {
                    const data = await fetchEvaluationsByDate({
                        userId: TEST_USER.userId,
                        startDate: weekStartDateString(weekStart),
                    });
                    if (data && Array.isArray(data.evaluations)) {
                        const mapped = mapEvaluationsToRawEntries(data);
                        if (mapped.length === 0) {
                            noDataWeeksRef.current[weekKey] = true;
                            console.log("[journal] week_cached_empty", { weekKey });
                        } else {
                            loadedWeeksRef.current[weekKey] = mapped;
                            console.log("[journal] week_cached_memory", { weekKey, count: mapped.length });
                        }
                        rawEntries = mapped;
                    } else {
                        // Server error or malformed response: do not cache, allow retry on reselect.
                        console.warn("[journal] week_fetch_failed", { weekKey });
                        rawEntries = [];
                    }
                // }
            }

            if (cancelled) return;
            const derived = buildWeekData(weekStart, rawEntries);
            setAllWeekEntries(rawEntries);
            setWeekData(derived);
            setWeekLoading(false);
        };

        run();

        return () => { cancelled = true; };
    }, [weekStart.toISOString()]);

    // When the selected day changes: filter from the already-fetched week entries
    // Does not call the API again, its sliced from what we collected
    useEffect(() => {
        if (!weekData || allWeekEntries.length === 0) return;

        const targetDate = weekData.days[selectedDayIndex]?.date;
        if (!targetDate) return;

        setDayLoading(true);

        // Filter the week's entries down to just the selected day, then transform
        const dayRaw = allWeekEntries.filter(e => e.timestamp.startsWith(targetDate));
        const dayEntries = dayRaw
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp)) // chronological
            .map(transformEntry);

        setEntries(dayEntries);
        setDayLoading(false);

    }, [weekData, selectedDayIndex, allWeekEntries]);

    const selectDay = useCallback((index: number) => {
        setSelectedDayIndex(index);
    }, []);

    const selectWeek = useCallback((newWeekStart: Date) => {
        setWeekStart(newWeekStart);
        setSelectedDayIndex(0);
    }, []);

    return {
        weekStart,
        weekData,
        entries,
        selectedDayIndex,
        weekLoading,
        dayLoading,
        selectDay,
        selectWeek,
    };
}
