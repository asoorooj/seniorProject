import { useState, useEffect, useCallback } from 'react';
import { colors } from '@/assets/colors/colors';
import { LogEntryData } from '@/components/journal/LogEntry';

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

interface RawEntry {
    id: string;
    // ISO 8601 e.g. "2025-03-15T20:00:00Z"
    timestamp: string;
    // Overall well-being score for this entry, 0–100
    score: number;
    // e.g. "mostly_calm"
    mood: string;
    journal_text: string | null;
    suggestion: string | null;
    tip: string | null;
    face:  { score: number; label: string };
    voice: { score: number; label: string };
    text:  { score: number; label: string };
}

{/*
    Hard-coded dummy data, please replace this with a proper API call
    e.g. fetch(`/api/journal?from=${from}&to=${to}')
    it would return an array of days with an array of entries in those days
    the data needed in those entries would look something like this according to the mockup
    but we can change if needed
*/}

async function fetchWeekEntries(weekStart: Date): Promise<RawEntry[]> {
    await new Promise(r => setTimeout(r, 450)); // simulate network delay

    // entries is an array keeping entries for the week, keeping date and index, followed by
    // timestamp, then entry specific data, all are used in visualizing it in LogEntry
    // API wise, I could iterate through a list of entries seperated by day, sunday index 0
    // go through that data and push it to entries
    const entries: RawEntry[] = [];

    let asyncFunction = async () =>{
        let thisItem = await fetch(`http://192.168.1.182:5000/test-db/evaluation/by-date?user_id=1&start_date=${weekStart}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        let jsonData = await thisItem.json();
        return jsonData;
    }
    const data = await asyncFunction();

    let transformedData:any[] = data.evaluations.map((entry: any) => {
        return {
            id: entry.evaluation.id,
            timestamp: entry.evaluation.timestamp,
            mood: entry.evaluation.emotionLabel,
            score: entry.evaluation.emotionScore,
            face: {
                score: entry.image.emotionScore,
                label: entry.image.emotionLabel,
            },
            voice: {
                score: entry.audio.emotionScore,
                label: entry.audio.emotionLabel,
            },
            text: {
                score: entry.text.emotionScore,
                label: entry.text.emotionLabel,
            },
            journal_text: null,
            suggestion: entry.evaluation.suggestion,
            tip: null,
        };
    });

    return transformedData;
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
    return {
        id: raw.id,
        mood: raw.mood.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
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

    // When the week changes: fetch all entries, then derive WeekData from them
    useEffect(() => {
        let cancelled = false;
        setWeekLoading(true);

        fetchWeekEntries(weekStart).then(rawEntries => {
            if (cancelled) return;

            // Derive week-level aggregates from the raw entries
            const derived = buildWeekData(weekStart, rawEntries);

            setAllWeekEntries(rawEntries);
            setWeekData(derived);
            setWeekLoading(false);
        });

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
