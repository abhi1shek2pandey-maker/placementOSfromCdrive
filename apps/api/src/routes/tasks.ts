import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Task } from '../db/models/Task';
import { TaskAttempt } from '../db/models/TaskAttempt';
import { LearningTopic } from '../db/models/LearningTopic';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'rescheduled']),
  actualMinutes: z.number().optional(),
  skipReason: z.string().optional(),
  selfRating: z.number().min(1).max(5).optional(),
  hintsUsed: z.number().optional(),
  solvedIndependently: z.boolean().optional(),
  mistakes: z.string().optional(),
  feedback: z.string().optional(),
  distractionMinutes: z.number().optional(),
});

// PATCH /api/tasks/:taskId/status
router.patch('/:taskId/status', async (req: AuthRequest, res: Response) => {
  const body = UpdateStatusSchema.parse(req.body);
  const userId = new mongoose.Types.ObjectId(req.userId!);

  const task = await Task.findOne({ _id: req.params.taskId, userId });
  if (!task) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  const prevStatus = task.status;
  task.status = body.status;

  if (body.status === 'completed') {
    task.completedAt = new Date();
    task.actualMinutes = body.actualMinutes ?? task.estimatedMinutes;

    // Update learning topic proficiency if linked
    if (task.topicId) {
      await LearningTopic.findByIdAndUpdate(task.topicId, {
        $set: {
          lastPracticedAt: new Date(),
          proficiencyState: 'practiced',
          // Simple revision scheduling: next revision in 7 days
          nextRevisionAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        $inc: { completedHours: (body.actualMinutes ?? task.estimatedMinutes) / 60 },
      });
    }
  }

  if (body.status === 'skipped' && body.skipReason) {
    task.skipReason = body.skipReason;
    task.carriedForwardCount += 1;
  }

  await task.save();

  // Record attempt
  if (body.status === 'completed' || body.status === 'skipped') {
    await TaskAttempt.create({
      userId,
      taskId: task._id,
      startedAt: task.scheduledStart ?? new Date(),
      endedAt: new Date(),
      actualMinutes: body.actualMinutes ?? null,
      outcome: body.status === 'completed' ? 'completed' : 'skipped',
      selfRating: body.selfRating ?? 3,
      hintsUsed: body.hintsUsed ?? 0,
      solvedIndependently: body.solvedIndependently ?? null,
      mistakes: body.mistakes ?? '',
      feedback: body.feedback ?? '',
      distractionMinutes: body.distractionMinutes ?? 0,
    });
  }

  res.json({ success: true, data: task });
});

// GET /api/tasks — list tasks for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, date } = req.query;
  const userId = new mongoose.Types.ObjectId(req.userId!);

  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = status;
  if (date) {
    const d = new Date(`${date}T00:00:00+05:30`);
    const dEnd = new Date(`${date}T23:59:59+05:30`);
    filter.scheduledStart = { $gte: d, $lte: dEnd };
  }

  const tasks = await Task.find(filter).sort({ scheduledStart: 1, priority: 1 }).lean();
  res.json({ success: true, data: tasks });
});

// GET /api/tasks/pending-carryforward — tasks that need review
router.get('/pending-carryforward', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const tasks = await Task.find({
    userId,
    status: { $in: ['pending', 'skipped', 'rescheduled'] },
    carriedForwardCount: { $gte: 3 },
  }).lean();
  res.json({ success: true, data: tasks });
});

export default router;
