import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateDailyPlan } from '../services/planner/planningEngine';
import { DailyPlan } from '../db/models/DailyPlan';
import { Task } from '../db/models/Task';
import mongoose from 'mongoose';
import { getTodayIST } from '../services/timetable/availabilityEngine';
import { format } from 'date-fns';

const router = Router();
router.use(authenticate);

const CheckInSchema = z.object({
  freeText: z.string().optional(),
  energyLevel: z.enum(['low', 'medium', 'high']).optional(),
  urgentDeadlines: z.array(z.string()).optional(),
  unexpectedCommitments: z.array(z.string()).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// POST /api/plans/generate
router.post('/generate', async (req: AuthRequest, res: Response) => {
  const body = CheckInSchema.parse(req.body);
  const plan = await generateDailyPlan(req.userId!, body, body.date);
  res.json({ success: true, data: plan });
});

// GET /api/plans/today
router.get('/today', async (req: AuthRequest, res: Response) => {
  const dateStr = getTodayIST();
  const dateObj = new Date(`${dateStr}T00:00:00+05:30`);
  const userId = new mongoose.Types.ObjectId(req.userId!);

  const plan = await DailyPlan.findOne({ userId, date: dateObj }).lean();
  if (!plan) {
    res.json({ success: true, data: null });
    return;
  }

  const tasks = await Task.find({ planId: plan._id }).sort({ scheduledStart: 1 }).lean();
  res.json({ success: true, data: { ...plan, tasks } });
});

// GET /api/plans/:planId
router.get('/:planId', async (req: AuthRequest, res: Response) => {
  const plan = await DailyPlan.findOne({
    _id: req.params.planId,
    userId: req.userId!,
  }).lean();

  if (!plan) {
    res.status(404).json({ success: false, error: 'Plan not found' });
    return;
  }

  const tasks = await Task.find({ planId: plan._id }).sort({ scheduledStart: 1 }).lean();
  res.json({ success: true, data: { ...plan, tasks } });
});

export default router;
