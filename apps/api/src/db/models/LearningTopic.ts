import mongoose, { Document, Schema } from 'mongoose';

export interface ILearningResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'problem_set' | 'documentation';
  estimatedMinutes: number;
}

export interface ILearningTopic extends Document {
  userId: mongoose.Types.ObjectId;
  trackId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  prerequisites: mongoose.Types.ObjectId[];
  proficiencyState:
    | 'not_started'
    | 'learning'
    | 'practiced'
    | 'interview_ready'
    | 'needs_revision';
  estimatedHours: number;
  completedHours: number;
  lastPracticedAt: Date | null;
  nextRevisionAt: Date | null;
  revisionIntervalDays: number;
  resources: ILearningResource[];
  notes: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<ILearningResource>(
  {
    title: String,
    url: String,
    type: { type: String, enum: ['video', 'article', 'problem_set', 'documentation'] },
    estimatedMinutes: Number,
  },
  { _id: false }
);

const LearningTopicSchema = new Schema<ILearningTopic>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'LearningTrack', required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'LearningTopic' }],
    proficiencyState: {
      type: String,
      enum: ['not_started', 'learning', 'practiced', 'interview_ready', 'needs_revision'],
      default: 'not_started',
    },
    estimatedHours: { type: Number, default: 2 },
    completedHours: { type: Number, default: 0 },
    lastPracticedAt: { type: Date, default: null },
    nextRevisionAt: { type: Date, default: null },
    revisionIntervalDays: { type: Number, default: 7 },
    resources: [ResourceSchema],
    notes: { type: String, default: '' },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LearningTopicSchema.index({ userId: 1, trackId: 1, orderIndex: 1 });
LearningTopicSchema.index({ userId: 1, proficiencyState: 1 });
LearningTopicSchema.index({ userId: 1, nextRevisionAt: 1 });

export const LearningTopic = mongoose.model<ILearningTopic>('LearningTopic', LearningTopicSchema);
