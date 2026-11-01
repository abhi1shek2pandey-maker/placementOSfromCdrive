import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { DailyPlan } from '../db/models/DailyPlan';
import { Task } from '../db/models/Task';
import { TaskAttempt } from '../db/models/TaskAttempt';
import { LearningTrack } from '../db/models/LearningTrack';
import { LearningTopic } from '../db/models/LearningTopic';
import { getTodayIST } from '../services/timetable/availabilityEngine';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);

// GET /api/dashboard
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const dateStr = getTodayIST();
  const dateObj = new Date(`${dateStr}T00:00:00+05:30`);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [todayPlan, weeklyTasks, weeklyAttempts, upcomingDeadlines, tracks] = await Promise.all([
    DailyPlan.findOne({ userId, date: dateObj }).lean(),
    Task.find({
      userId,
      scheduledStart: { $gte: weekAgo },
    }).lean(),
    TaskAttempt.find({ userId, startedAt: { $gte: weekAgo } }).lean(),
    Task.find({
      userId,
      deadline: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      status: { $ne: 'completed' },
    })
      .sort({ deadline: 1 })
      .limit(5)
      .lean(),
    LearningTrack.find({ userId, isActive: true }).sort({ priority: 1 }).lean(),
  ]);

  let todayTasks: typeof weeklyTasks = [];
  let currentTask = null;

  if (todayPlan) {
    todayTasks = await Task.find({ planId: todayPlan._id }).sort({ scheduledStart: 1 }).lean();
    currentTask =
      todayTasks.find((t) => t.status === 'in_progress') ??
      todayTasks.find((t) => t.status === 'pending') ??
      null;
  }

  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
  const focusedMinutesToday = weeklyAttempts
    .filter((a) => {
      const d = a.startedAt.toISOString().slice(0, 10);
      return d === dateStr;
    })
    .reduce((sum, a) => sum + (a.actualMinutes ?? 0), 0);

  // Weekly stats
  const completedThisWeek = weeklyTasks.filter((t) => t.status === 'completed').length;
  const totalThisWeek = weeklyTasks.length;
  const focusedMinutesWeek = weeklyAttempts.reduce((sum, a) => sum + (a.actualMinutes ?? 0), 0);

  res.json({
    success: true,
    data: {
      todayPlan: todayPlan
        ? { ...todayPlan, tasks: todayTasks }
        : null,
      currentTask,
      upcomingTasks: todayTasks.filter((t) =>
        ['pending', 'in_progress'].includes(t.status)
      ),
      completedTodayCount: completedToday,
      totalTodayCount: todayTasks.length,
      focusedMinutesToday,
      upcomingDeadlines: upcomingDeadlines.map((t) => ({
        title: t.title,
        deadline: t.deadline,
        type: t.category,
      })),
      weeklyStats: {
        tasksCompleted: completedThisWeek,
        tasksTotal: totalThisWeek,
        focusedMinutes: focusedMinutesWeek,
        completionRate:
          totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0,
      },
      tracks: tracks.map((t) => ({ id: t._id, name: t.name, priority: t.priority })),
    },
  });
});

export default router;
