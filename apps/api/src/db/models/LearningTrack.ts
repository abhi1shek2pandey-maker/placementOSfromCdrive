import mongoose, { Document, Schema } from 'mongoose';

export interface ILearningTrack extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  priority: number;
  targetOutcome: string;
  overallProgressPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LearningTrackSchema = new Schema<ILearningTrack>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    priority: { type: Number, required: true, min: 1 },
    targetOutcome: { type: String, required: true },
    overallProgressPercent: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LearningTrackSchema.index({ userId: 1, priority: 1 });

export const LearningTrack = mongoose.model<ILearningTrack>('LearningTrack', LearningTrackSchema);
