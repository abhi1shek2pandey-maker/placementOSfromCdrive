/**
 * Planning Engine — orchestrates the full daily plan generation workflow.
 *
 * Flow:
 *  1. Load profile + timetable
 *  2. Compute available blocks (deterministic)
 *  3. Load context: carry-forward, revisions, roadmap, projects
 *  4. Build LLM prompt
 *  5. Call LLM → get draft plan (JSON)
 *  6. Validate with deterministic validator
 *  7. Repair if needed (up to 2 attempts)
 *  8. Persist plan + tasks
 *  9. Return plan
 */

import { z } from 'zod';
import { getLLMProvider } from '../llm/geminiProvider';
import {
  computeFreeBlocks,
  getActiveTimetableVersion,
  getTodayIST,
  AvailabilityResult,
} from '../timetable/availabilityEngine';
import { validateSchedule, DraftTask } from './scheduleValidator';
import {
  PLANNER_SYSTEM_PROMPT,
  buildPlannerPrompt,
  PROMPT_VERSION,
} from './plannerPrompts';
import { TimetableVersion } from '../../db/models/TimetableVersion';
import { UserProfile } from '../../db/models/UserProfile';
import { LearningTrack } from '../../db/models/LearningTrack';
import { LearningTopic } from '../../db/models/LearningTopic';
import { Project } from '../../db/models/Project';
import { Task } from '../../db/models/Task';
import { DailyPlan } from '../../db/models/DailyPlan';
import { logger } from '../../config/logger';
import mongoose from 'mongoose';
// date-fns format used via ISO string construction below

// ── Zod schema for LLM output validation ─────────────────────

const TaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(['DSA', 'Core CS', 'Backend', 'System Design', 'GenAI', 'DevOps', 'Placement', 'Project', 'Hackathon']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  isMajorTask: z.boolean(),
  estimatedMinutes: z.number().min(10).max(360),
  scheduledStart: z.string().regex(/^\d{2}:\d{2}$/),
  scheduledEnd: z.string().regex(/^\d{2}:\d{2}$/),
  completionCriteria: z.string().min(10),
  expectedOutcome: z.string().min(5),
  whySelected: z.string().min(5),
  resources: z.array(z.object({ title: z.string(), url: z.string().url() })).min(1),
});

const PlanResponseSchema = z.object({
  planSummary: z.string(),
  tasks: z.array(TaskSchema).min(1).max(6),
});

type PlanResponse = z.infer<typeof PlanResponseSchema>;

export interface CheckInData {
  freeText?: string;
  availableMinutes?: number;
  energyLevel?: 'low' | 'medium' | 'high';
  urgentDeadlines?: string[];
  unexpectedCommitments?: string[];
}

export interface GeneratedPlan {
  planId: string;
  date: string;
  planSummary: string;
  tasks: DraftTask[];
  availability: AvailabilityResult;
  validationNotes: string[];
  repaired: boolean;
}

const MAX_REPAIR_ATTEMPTS = 2;

export async function generateDailyPlan(
  userId: string,
  checkIn: CheckInData,
  dateOverride?: string
): Promise<GeneratedPlan> {
  const dateStr = dateOverride ?? getTodayIST();
  const userObjId = new mongoose.Types.ObjectId(userId);

  logger.info('Starting daily plan generation', { userId, date: dateStr });

  // ── 1. Load profile ──────────────────────────────────────
  const profile = await UserProfile.findOne({ userId: userObjId });
  if (!profile) throw new Error('User profile not found. Please complete setup first.');

  const config = profile.config;

  // ── 2. Load timetable ─────────────────────────────────────
  const allVersions = await TimetableVersion.find({ userId: userObjId });
  const activeTimetable = getActiveTimetableVersion(allVersions, dateStr);

  // ── 3. Compute free blocks ────────────────────────────────
  const availability = computeFreeBlocks(dateStr, activeTimetable, profile);

  if (availability.usableMinutes < 30) {
    logger.warn('Very little usable time today', { usableMinutes: availability.usableMinutes });
  }

  // ── 4. Load context ───────────────────────────────────────
  const [pendingTasks, dueRevisions, notStartedTopics, activeProjects, recentDone] =
    await Promise.all([
      // Carry-forward pending tasks (not completed, not from today's plan)
      Task.find({
        userId: userObjId,
        status: { $in: ['pending', 'skipped', 'rescheduled'] },
      })
        .sort({ priority: 1, deadline: 1 })
        .limit(10)
        .lean(),

      // Topics due for revision
      LearningTopic.find({
        userId: userObjId,
        nextRevisionAt: { $lte: new Date() },
        proficiencyState: { $ne: 'not_started' },
      })
        .populate('trackId', 'name')
        .limit(5)
        .lean(),

      // Next unstarted topics sorted by track priority
      LearningTopic.find({ userId: userObjId, proficiencyState: 'not_started' })
        .populate('trackId', 'name priority')
        .sort({ 'trackId.priority': 1, orderIndex: 1 })
        .limit(10)
        .lean(),

      // Active projects
      Project.find({ userId: userObjId, status: 'active' }).lean(),

      // Recent completions (last 3 days)
      Task.find({
        userId: userObjId,
        status: 'completed',
        completedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      })
        .sort({ completedAt: -1 })
        .limit(5)
        .lean(),
    ]);

  // ── 5. Build prompt ───────────────────────────────────────
  const promptContext = {
    date: dateStr,
    dayOfWeek: availability.dayOfWeek,
    energyLevel: checkIn.energyLevel ?? 'medium',
    availableBlocks: availability.freeBlocks,
    usableMinutes: availability.usableMinutes,
    totalFreeMinutes: availability.totalFreeMinutes,
    userCheckIn: checkIn.freeText ?? '',
    urgentDeadlines: checkIn.urgentDeadlines ?? [],
    unexpectedCommitments: checkIn.unexpectedCommitments ?? [],
    pendingCarryForward: pendingTasks.map((t) => ({
      title: t.title,
      category: t.category,
      carriedForwardCount: t.carriedForwardCount,
      priority: t.priority,
    })),
    dueForRevision: dueRevisions.map((r) => ({
      topic: r.name,
      trackName: (r.trackId as any)?.name ?? 'Unknown',
      lastPracticed: r.lastPracticedAt?.toISOString() ?? null,
      nextRevisionAt: r.nextRevisionAt?.toISOString() ?? null,
    })),
    notStartedTopics: notStartedTopics.map((t) => ({
      topic: t.name,
      trackName: (t.trackId as any)?.name ?? 'Unknown',
      priority: (t.trackId as any)?.priority ?? 99,
    })),
    activeProjects: activeProjects.map((p) => ({
      name: p.name,
      status: p.status,
      nextMilestone: p.milestones?.find((m) => m.status === 'pending')?.title ?? null,
    })),
    recentCompletions: recentDone.map((t) => ({
      title: t.title,
      category: t.category,
      completedAt: t.completedAt?.toISOString() ?? '',
    })),
    maxMajorTasks: config.maxMajorTasks,
  };

  const userPrompt = buildPlannerPrompt(promptContext);
  const systemPrompt = PLANNER_SYSTEM_PROMPT.replace(
    '{maxMajorTasks}',
    String(config.maxMajorTasks)
  );

  // ── 6. LLM call + Zod validation ─────────────────────────
  const llm = getLLMProvider();
  let rawResponse: unknown;

  try {
    rawResponse = await llm.generateJSON<unknown>(userPrompt, systemPrompt);
  } catch (err) {
    logger.error('LLM call failed during planning', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error('Plan generation failed: LLM unavailable. Please try again.');
  }

  const parseResult = PlanResponseSchema.safeParse(rawResponse);
  if (!parseResult.success) {
    logger.error('LLM output failed Zod validation', { issues: parseResult.error.issues });
    throw new Error(
      `LLM returned an invalid plan structure: ${parseResult.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  let draftTasks: DraftTask[] = parseResult.data.tasks as DraftTask[];
  const planSummary = parseResult.data.planSummary;

  // ── 7. Validate + repair ──────────────────────────────────
  let validationResult = validateSchedule(draftTasks, availability, config.maxMajorTasks);
  let repairAttempt = 0;

  while (!validationResult.valid && repairAttempt < MAX_REPAIR_ATTEMPTS) {
    repairAttempt++;
    logger.warn(`Plan validation failed — repair attempt ${repairAttempt}`, {
      notes: validationResult.notes,
    });
    draftTasks = validationResult.repairedTasks ?? draftTasks;
    validationResult = validateSchedule(draftTasks, availability, config.maxMajorTasks);
  }

  if (validationResult.repairedTasks) {
    draftTasks = validationResult.repairedTasks;
  }

  // ── 8. Persist plan (upsert — idempotent) ─────────────────
  const dateObj = new Date(`${dateStr}T00:00:00+05:30`);
  const totalAllocated = draftTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const plan = await DailyPlan.findOneAndUpdate(
    { userId: userObjId, date: dateObj },
    {
      $set: {
        timetableVersionId: activeTimetable?._id ?? null,
        planVersion: 1,
        status: 'active',
        planningInputs: {
          availableMinutes: availability.totalFreeMinutes,
          userCheckIn: checkIn.freeText ?? '',
          energyLevel: checkIn.energyLevel ?? 'medium',
          urgentDeadlines: checkIn.urgentDeadlines ?? [],
          unexpectedCommitments: checkIn.unexpectedCommitments ?? [],
        },
        availableBlocks: availability.freeBlocks,
        totalAvailableMinutes: availability.totalFreeMinutes,
        allocatedMinutes: totalAllocated,
        bufferMinutes: availability.totalFreeMinutes - totalAllocated,
        validationStatus: validationResult.repaired ? 'repaired' : 'valid',
        validationNotes: validationResult.notes,
        generatedAt: new Date(),
        llmModel: llm.name + '/' + process.env.GEMINI_MODEL,
        promptVersion: PROMPT_VERSION,
      },
    },
    { upsert: true, new: true }
  );

  // Delete old tasks for this plan (replanning)
  await Task.deleteMany({ planId: plan._id, status: 'pending' });

  // Persist tasks
  const taskDocs = draftTasks.map((t) => {
    const startDate = new Date(`${dateStr}T${t.scheduledStart}:00+05:30`);
    const endDate = new Date(`${dateStr}T${t.scheduledEnd}:00+05:30`);
    return {
      userId: userObjId,
      planId: plan._id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      scheduledStart: startDate,
      scheduledEnd: endDate,
      estimatedMinutes: t.estimatedMinutes,
      status: 'pending' as const,
      completionCriteria: t.completionCriteria,
      expectedOutcome: t.expectedOutcome,
      resources: t.resources,
      isMajorTask: t.isMajorTask,
      whySelected: t.whySelected,
      carriedForwardCount: 0,
    };
  });

  await Task.insertMany(taskDocs);

  logger.info('Daily plan generated and persisted', {
    planId: plan._id.toString(),
    date: dateStr,
    taskCount: taskDocs.length,
    majorTasks: taskDocs.filter((t) => t.isMajorTask).length,
    allocatedMinutes: totalAllocated,
    usableMinutes: availability.usableMinutes,
    repaired: validationResult.repaired,
  });

  return {
    planId: plan._id.toString(),
    date: dateStr,
    planSummary,
    tasks: draftTasks,
    availability,
    validationNotes: validationResult.notes,
    repaired: validationResult.repaired,
  };
}
