import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../db/models/User';
import { UserProfile } from '../db/models/UserProfile';
import { TimetableVersion } from '../db/models/TimetableVersion';
import { env } from '../config/env';
import { logger } from '../config/logger';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      email: body.email.toLowerCase(),
      name: body.name,
      passwordHash,
    });

    // Create default profile
    const placementDeadline = new Date();
    placementDeadline.setMonth(placementDeadline.getMonth() + 6);

    await UserProfile.create({
      userId: user._id,
      careerGoals: {
        targetRoles: ['SDE', 'Backend Engineer'],
        targetCompanies: ['Google', 'Amazon', 'Microsoft', 'Goldman Sachs'],
        targetCTC: 1500000,
        placementDeadline,
      },
    });

    // Seed timetable version 1 (college schedule until Nov 30, 2026)
    await TimetableVersion.create({
      userId: user._id,
      version: 1,
      label: 'College Sem (Oct–Nov 2026)',
      effectiveFrom: new Date('2026-10-01'),
      effectiveTo: new Date('2026-11-30'),
      weeklySchedule: {
        monday: [
          { start: '09:00', end: '10:00', label: 'Class', type: 'class' },
          { start: '16:00', end: '18:00', label: 'Class', type: 'class' },
        ],
        tuesday: [
          { start: '09:00', end: '12:00', label: 'Class', type: 'class' },
          { start: '15:00', end: '18:00', label: 'Class', type: 'class' },
        ],
        wednesday: [
          { start: '09:00', end: '12:00', label: 'Class', type: 'class' },
          { start: '13:00', end: '16:00', label: 'Class', type: 'class' },
        ],
        thursday: [
          { start: '11:00', end: '13:00', label: 'Class', type: 'class' },
          { start: '14:00', end: '15:00', label: 'Class', type: 'class' },
        ],
        friday: [
          { start: '09:00', end: '13:00', label: 'Class', type: 'class' },
        ],
        saturday: [],
        sunday: [],
      },
    });

    // Timetable version 2: Dec 2026
    await TimetableVersion.create({
      userId: user._id,
      version: 2,
      label: 'December 2026 (No classes)',
      effectiveFrom: new Date('2026-12-01'),
      effectiveTo: new Date('2026-12-31'),
      weeklySchedule: {
        monday: [], tuesday: [], wednesday: [],
        thursday: [], friday: [], saturday: [], sunday: [],
      },
    });

    const token = jwt.sign({ userId: user._id.toString() }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    logger.info('User registered', { userId: user._id.toString() });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: err.issues });
      return;
    }
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = await User.findOne({ email: body.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: user._id.toString() }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, email: user.email },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: err.issues });
      return;
    }
    throw err;
  }
});

export default router;
