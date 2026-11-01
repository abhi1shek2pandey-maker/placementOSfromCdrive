import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyReview extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  date: Date;
  completedTaskIds: mongoose.Types.ObjectId[];
  skippedTaskIds: mongoose.Types.ObjectId[];
  skipReasons: Record<string, string>;
  totalFocusedMinutes: number;
  totalDistractedMinutes: number;
  selfRating: 1 | 2 | 3 | 4 | 5;
  reflectionNote: string;
  plannerFeedback: string;
  createdAt: Date;
}

const DailyReviewSchema = new Schema<IDailyReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'DailyPlan', required: true },
    date: { type: Date, required: true },
    completedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    skippedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    skipReasons: { type: Map, of: String, default: {} },
    totalFocusedMinutes: { type: Number, default: 0 },
    totalDistractedMinutes: { type: Number, default: 0 },
    selfRating: { type: Number, enum: [1, 2, 3, 4, 5], default: 3 },
    reflectionNote: { type: String, default: '' },
    plannerFeedback: { type: String, default: '' },
  },
  { timestamps: true }
);

DailyReviewSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyReview = mongoose.model<IDailyReview>('DailyReview', DailyReviewSchema);
