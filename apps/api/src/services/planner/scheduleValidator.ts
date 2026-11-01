/**
 * Deterministic Schedule Validator
 *
 * The LLM generates a draft plan. This module validates it against hard constraints.
 * If the plan fails validation, it is either repaired or rejected — never silently accepted.
 *
 * Constraints enforced:
 *  1. Max N major tasks (from user config)
 *  2. No task overlaps
 *  3. No task outside available free blocks
 *  4. No task after bedtime
 *  5. No task during meal blocks
 *  6. Total allocated time ≤ usable minutes (buffer enforced)
 *  7. Each task has a measurable completion criterion
 *  8. Each task has an estimated duration > 0
 */

import { FreeBlock, AvailabilityResult } from '../timetable/availabilityEngine';
import { logger } from '../../config/logger';

export interface DraftTask {
  id?: string;
  title: string;
  category: string;
  priority: string;
  estimatedMinutes: number;
  scheduledStart: string; // HH:mm
  scheduledEnd: string;   // HH:mm
  isMajorTask: boolean;
  completionCriteria: string;
  expectedOutcome: string;
  whySelected: string;
  resources: Array<{ title: string; url: string }>;
  description: string;
}

export interface ValidationResult {
  valid: boolean;
  repaired: boolean;
  notes: string[];
  repairedTasks?: DraftTask[];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function overlaps(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isInsideAnyFreeBlock(
  taskStart: number,
  taskEnd: number,
  freeBlocks: FreeBlock[]
): boolean {
  return freeBlocks.some((b) => {
    const bs = timeToMinutes(b.start);
    const be = timeToMinutes(b.end);
    return taskStart >= bs && taskEnd <= be;
  });
}

export function validateSchedule(
  tasks: DraftTask[],
  availability: AvailabilityResult,
  maxMajorTasks: number
): ValidationResult {
  const notes: string[] = [];
  let repaired = false;
  let repairedTasks = [...tasks];

  // ── 1. Completion criteria check ──────────────────────────
  for (const t of repairedTasks) {
    if (!t.completionCriteria || t.completionCriteria.trim().length < 10) {
      notes.push(`Task "${t.title}" has no measurable completion criteria.`);
    }
    if (t.estimatedMinutes <= 0) {
      notes.push(`Task "${t.title}" has invalid estimated duration.`);
    }
  }

  // ── 2. Max major tasks ─────────────────────────────────────
  const majorCount = repairedTasks.filter((t) => t.isMajorTask).length;
  if (majorCount > maxMajorTasks) {
    notes.push(
      `${majorCount} major tasks exceed the limit of ${maxMajorTasks}. Demoting lowest-priority extras.`
    );
    // Demote lowest-priority extras
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const majors = repairedTasks
      .filter((t) => t.isMajorTask)
      .sort(
        (a, b) =>
          (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
      );
    // Keep top N as major, demote the rest
    const toKeep = new Set(majors.slice(0, maxMajorTasks).map((t) => t.title));
    repairedTasks = repairedTasks.map((t) =>
      t.isMajorTask && !toKeep.has(t.title) ? { ...t, isMajorTask: false } : t
    );
    repaired = true;
  }

  // ── 3. Sort tasks by scheduledStart ───────────────────────
  repairedTasks.sort(
    (a, b) => timeToMinutes(a.scheduledStart) - timeToMinutes(b.scheduledStart)
  );

  // ── 4. Overlap detection ───────────────────────────────────
  for (let i = 0; i < repairedTasks.length - 1; i++) {
    const a = repairedTasks[i];
    const b = repairedTasks[i + 1];
    const aS = timeToMinutes(a.scheduledStart);
    const aE = timeToMinutes(a.scheduledEnd);
    const bS = timeToMinutes(b.scheduledStart);
    const bE = timeToMinutes(b.scheduledEnd);
    if (overlaps(aS, aE, bS, bE)) {
      notes.push(
        `Tasks "${a.title}" (${a.scheduledStart}–${a.scheduledEnd}) and ` +
        `"${b.title}" (${b.scheduledStart}–${b.scheduledEnd}) overlap. Attempting repair.`
      );
      // Shift task B to start after task A ends
      const newBStart = aE + 5; // 5-min gap
      const newBEnd = newBStart + b.estimatedMinutes;
      repairedTasks[i + 1] = {
        ...b,
        scheduledStart: minutesToTime(newBStart),
        scheduledEnd: minutesToTime(newBEnd),
      };
      repaired = true;
    }
  }

  // ── 5. Bedtime check ──────────────────────────────────────
  const bedMinutes = timeToMinutes(availability.freeBlocks.length > 0
    ? availability.freeBlocks[availability.freeBlocks.length - 1].end
    : '23:30');

  const violatesBedtime = repairedTasks.filter(
    (t) => timeToMinutes(t.scheduledEnd) > bedMinutes
  );
  if (violatesBedtime.length > 0) {
    notes.push(
      `Tasks [${violatesBedtime.map((t) => t.title).join(', ')}] extend past bedtime. Removing from plan.`
    );
    repairedTasks = repairedTasks.filter(
      (t) => timeToMinutes(t.scheduledEnd) <= bedMinutes
    );
    repaired = true;
  }

  // ── 6. Free-block containment ─────────────────────────────
  const outsideBlocks = repairedTasks.filter((t) => {
    const tS = timeToMinutes(t.scheduledStart);
    const tE = timeToMinutes(t.scheduledEnd);
    return !isInsideAnyFreeBlock(tS, tE, availability.freeBlocks);
  });
  if (outsideBlocks.length > 0) {
    notes.push(
      `Tasks [${outsideBlocks.map((t) => t.title).join(', ')}] are scheduled ` +
      `outside free study blocks (overlapping meals or classes). Removing.`
    );
    const outsideTitles = new Set(outsideBlocks.map((t) => t.title));
    repairedTasks = repairedTasks.filter((t) => !outsideTitles.has(t.title));
    repaired = true;
  }

  // ── 7. Buffer enforcement ─────────────────────────────────
  const totalAllocated = repairedTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  if (totalAllocated > availability.usableMinutes) {
    notes.push(
      `Total allocated ${totalAllocated} min exceeds usable ${availability.usableMinutes} min ` +
      `(${availability.totalFreeMinutes} free minus buffer). Trimming lowest-priority tasks.`
    );
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    repairedTasks.sort(
      (a, b) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4)
    );
    let running = 0;
    const kept: DraftTask[] = [];
    for (const t of repairedTasks) {
      if (running + t.estimatedMinutes <= availability.usableMinutes) {
        kept.push(t);
        running += t.estimatedMinutes;
      } else {
        notes.push(`Dropped "${t.title}" to fit within buffer.`);
      }
    }
    repairedTasks = kept;
    repaired = true;
  }

  const valid = notes.length === 0 || repaired;

  logger.info('Schedule validated', {
    tasksIn: tasks.length,
    tasksOut: repairedTasks.length,
    repaired,
    notes: notes.length,
  });

  return {
    valid,
    repaired,
    notes,
    repairedTasks,
  };
}
