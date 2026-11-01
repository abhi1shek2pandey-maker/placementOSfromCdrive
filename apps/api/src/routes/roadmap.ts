import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningTrack } from '../db/models/LearningTrack';
import { LearningTopic } from '../db/models/LearningTopic';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);

// GET /api/roadmap — all tracks with topics
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);

  const tracks = await LearningTrack.find({ userId, isActive: true })
    .sort({ priority: 1 })
    .lean();

  const trackIds = tracks.map((t) => t._id);
  const topics = await LearningTopic.find({ userId, trackId: { $in: trackIds } })
    .sort({ orderIndex: 1 })
    .lean();

  const topicsByTrack = topics.reduce(
    (acc, t) => {
      const key = t.trackId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, typeof topics>
  );

  const result = tracks.map((track) => ({
    ...track,
    topics: topicsByTrack[track._id.toString()] ?? [],
  }));

  res.json({ success: true, data: result });
});

// GET /api/roadmap/due-revisions
router.get('/due-revisions', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);
  const topics = await LearningTopic.find({
    userId,
    nextRevisionAt: { $lte: new Date() },
    proficiencyState: { $ne: 'not_started' },
  })
    .populate('trackId', 'name')
    .sort({ nextRevisionAt: 1 })
    .lean();

  res.json({ success: true, data: topics });
});

// GET /api/roadmap/progress — track-level summary
router.get('/progress', async (req: AuthRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId!);

  const tracks = await LearningTrack.find({ userId, isActive: true }).lean();
  const summary = await Promise.all(
    tracks.map(async (track) => {
      const topics = await LearningTopic.find({ userId, trackId: track._id }).lean();
      const total = topics.length;
      const done = topics.filter((t) =>
        ['practiced', 'interview_ready'].includes(t.proficiencyState)
      ).length;
      const inProgress = topics.filter((t) => t.proficiencyState === 'learning').length;
      const needsRevision = topics.filter((t) => t.proficiencyState === 'needs_revision').length;
      return {
        trackId: track._id,
        name: track.name,
        priority: track.priority,
        total,
        done,
        inProgress,
        needsRevision,
        progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    })
  );

  res.json({ success: true, data: summary });
});

export default router;
