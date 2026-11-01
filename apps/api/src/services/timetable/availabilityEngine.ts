import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ITimetableVersion } from '../../db/models/TimetableVersion';
import { IUserProfile } from '../../db/models/UserProfile';
import { logger } from '../../config/logger';

export interface FreeBlock {
  start: string; // HH:mm
  end: string;   // HH:mm
  durationMinutes: number;
}

export interface AvailabilityResult {
  date: string;         // YYYY-MM-DD
  dayOfWeek: string;
  freeBlocks: FreeBlock[];
  totalFreeMinutes: number;
  usableMinutes: number; // after applying bufferPercent
  fixedCommitments: Array<{ start: string; end: string; label: string }>;
}

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const TIMEZONE = 'Asia/Kolkata';
const DATE_FMT = 'yyyy-MM-dd';
const TIME_FMT = 'HH:mm';

/**
 * Parse "HH:mm" into total minutes since midnight.
 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight back to "HH:mm".
 */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Merge overlapping or adjacent time intervals (represented as [start, end] in minutes).
 * Returns sorted, merged intervals.
 */
function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

/**
 * Given a date (IST), a timetable version, and a user profile,
 * compute the ordered list of free study blocks for that day.
 *
 * Blocked time includes:
 *   - wake-up buffer (first 15 min after wake-up for morning routine)
 *   - college classes
 *   - travel (10 min each side of a class block)
 *   - all meal blocks
 *   - bedtime (everything after bedtime)
 *   - timetable exceptions (holidays, extra classes)
 */
export function computeFreeBlocks(
  dateStr: string, // YYYY-MM-DD in IST
  timetable: ITimetableVersion | null,
  profile: IUserProfile
): AvailabilityResult {
  const config = profile.config;
  const wakeMinutes = timeToMinutes(config.wakeUpTime);
  const bedMinutes = timeToMinutes(config.bedtime);
  const travelMin = config.travelMinutes ?? 10;

  // Collect all blocked intervals in minutes since midnight
  const blockedIntervals: Array<[number, number]> = [];
  const fixedCommitments: Array<{ start: string; end: string; label: string }> = [];

  // 1. Before wake-up
  blockedIntervals.push([0, wakeMinutes]);

  // 2. After bedtime
  blockedIntervals.push([bedMinutes, 24 * 60]);

  // 3. Meal blocks
  for (const meal of config.mealBlocks) {
    const s = timeToMinutes(meal.start);
    const e = timeToMinutes(meal.end);
    blockedIntervals.push([s, e]);
    fixedCommitments.push({ start: meal.start, end: meal.end, label: meal.label });
  }

  // 4. College classes + travel from timetable
  if (timetable) {
    const dateObj = new Date(`${dateStr}T00:00:00+05:30`);
    const dayIndex = dateObj.getDay(); // 0=Sun, 1=Mon, ...
    const dayNames: DayKey[] = [
      'sunday', 'monday', 'tuesday', 'wednesday',
      'thursday', 'friday', 'saturday',
    ];
    const dayKey = dayNames[dayIndex];

    // Check for exception on this date
    const exception = timetable.exceptions.find(
      (ex) => format(new Date(ex.date), DATE_FMT) === dateStr
    );

    let slotsToBlock: Array<{ start: string; end: string; label: string; type?: string }> = [];

    if (exception) {
      if (exception.type === 'holiday') {
        // No class blocks
        fixedCommitments.push({ start: '00:00', end: '00:00', label: `Holiday: ${exception.note}` });
      } else {
        slotsToBlock = exception.slots.map((s) => ({ ...s, label: exception.note }));
      }
    } else {
      slotsToBlock = (timetable.weeklySchedule[dayKey] || []).map((s) => ({
        start: s.start,
        end: s.end,
        label: s.label,
        type: s.type,
      }));
    }

    for (const slot of slotsToBlock) {
      const classStart = timeToMinutes(slot.start);
      const classEnd = timeToMinutes(slot.end);
      // Add travel buffer on both sides
      const blockedStart = Math.max(0, classStart - travelMin);
      const blockedEnd = Math.min(24 * 60, classEnd + travelMin);
      blockedIntervals.push([blockedStart, blockedEnd]);
      fixedCommitments.push({ start: slot.start, end: slot.end, label: slot.label });
    }
  }

  // Merge all blocked intervals
  const merged = mergeIntervals(blockedIntervals);

  // 5. Compute free gaps between blocked intervals
  const dayStart = wakeMinutes;
  const dayEnd = bedMinutes;
  const freeBlocks: FreeBlock[] = [];

  let cursor = dayStart;
  for (const [bStart, bEnd] of merged) {
    if (bStart <= cursor) {
      cursor = Math.max(cursor, bEnd);
      continue;
    }
    const freeStart = cursor;
    const freeEnd = bStart;
    if (freeEnd - freeStart >= 15) { // only keep blocks ≥15 min
      freeBlocks.push({
        start: minutesToTime(freeStart),
        end: minutesToTime(freeEnd),
        durationMinutes: freeEnd - freeStart,
      });
    }
    cursor = bEnd;
  }
  // Trailing free block
  if (cursor < dayEnd && dayEnd - cursor >= 15) {
    freeBlocks.push({
      start: minutesToTime(cursor),
      end: minutesToTime(dayEnd),
      durationMinutes: dayEnd - cursor,
    });
  }

  const totalFreeMinutes = freeBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
  const bufferFraction = (config.bufferPercent ?? 20) / 100;
  const usableMinutes = Math.floor(totalFreeMinutes * (1 - bufferFraction));

  const dayNames2: DayKey[] = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday',
  ];
  const dateObj = new Date(`${dateStr}T00:00:00+05:30`);
  const dayOfWeek = dayNames2[dateObj.getDay()];

  logger.debug('Free blocks computed', {
    date: dateStr,
    day: dayOfWeek,
    freeBlocks: freeBlocks.length,
    totalFreeMinutes,
    usableMinutes,
  });

  return {
    date: dateStr,
    dayOfWeek,
    freeBlocks,
    totalFreeMinutes,
    usableMinutes,
    fixedCommitments,
  };
}

/**
 * Get the currently active timetable version for a given date.
 * Returns the version where effectiveFrom <= date <= effectiveTo (or effectiveTo is null).
 */
export function getActiveTimetableVersion(
  versions: ITimetableVersion[],
  dateStr: string
): ITimetableVersion | null {
  const dateMs = new Date(`${dateStr}T00:00:00+05:30`).getTime();

  const active = versions.filter((v) => {
    const from = new Date(v.effectiveFrom).getTime();
    const to = v.effectiveTo ? new Date(v.effectiveTo).getTime() : Infinity;
    return from <= dateMs && dateMs <= to;
  });

  if (active.length === 0) return null;
  // If multiple match (shouldn't happen), pick the most recent
  return active.sort((a, b) =>
    new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
  )[0];
}

/**
 * Get today's date string in IST (YYYY-MM-DD).
 */
export function getTodayIST(): string {
  const now = toZonedTime(new Date(), TIMEZONE);
  return format(now, DATE_FMT);
}
