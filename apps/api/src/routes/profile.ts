import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserProfile } from '../db/models/UserProfile';
import { TimetableVersion } from '../db/models/TimetableVersion';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);

// GET /api/profile
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const profile = await UserProfile.findOne({ userId }).lean();
  if (!profile) {
    res.status(404).json({ success: false, error: 'Profile not found' });
    return;
  }
  res.json({ success: true, data: profile });
});

const UpdateConfigSchema = z.object({
  wakeUpTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  bedtime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  planDeliveryTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxMajorTasks: z.number().min(1).max(5).optional(),
  bufferPercent: z.number().min(10).max(40).optional(),
  mealBlocks: z.array(z.object({
    start: z.string(),
    end: z.string(),
    label: z.string(),
  })).optional(),
  travelMinutes: z.number().min(0).max(120).optional(),
});

// PATCH /api/profile/config
router.patch('/config', async (req: AuthRequest, res: Response) => {
  const body = UpdateConfigSchema.parse(req.body);
  const userId = new mongoose.Types.ObjectId(req.userId!);

  const updateFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) updateFields[`config.${k}`] = v;
  }

  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: updateFields },
    { new: true }
  );

  res.json({ success: true, data: profile });
});

// GET /api/profile/timetable
router.get('/timetable', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const versions = await TimetableVersion.find({ userId }).sort({ effectiveFrom: 1 }).lean();
  res.json({ success: true, data: versions });
});

// POST /api/profile/timetable — add a new timetable version
router.post('/timetable', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const { version, label, effectiveFrom, effectiveTo, weeklySchedule, exceptions } = req.body;

  const newVersion = await TimetableVersion.create({
    userId,
    version,
    label,
    effectiveFrom: new Date(effectiveFrom),
    effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    weeklySchedule,
    exceptions: exceptions ?? [],
  });

  res.status(201).json({ success: true, data: newVersion });
});

// GET /api/profile/notifications
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const profile = await UserProfile.findOne({ userId }, { notifications: 1 }).lean();
  res.json({ success: true, data: profile?.notifications });
});

// PATCH /api/profile/notifications
router.patch('/notifications', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const { telegramChatId, quietHoursStart, quietHoursEnd, enabled, reminderIntervalMinutes } =
    req.body;

  const updateFields: Record<string, unknown> = {};
  if (telegramChatId !== undefined) updateFields['notifications.telegramChatId'] = telegramChatId;
  if (quietHoursStart !== undefined) updateFields['notifications.quietHoursStart'] = quietHoursStart;
  if (quietHoursEnd !== undefined) updateFields['notifications.quietHoursEnd'] = quietHoursEnd;
  if (enabled !== undefined) updateFields['notifications.enabled'] = enabled;
  if (reminderIntervalMinutes !== undefined)
    updateFields['notifications.reminderIntervalMinutes'] = reminderIntervalMinutes;

  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: updateFields },
    { new: true }
  );
  res.json({ success: true, data: profile?.notifications });
});

export default router;
