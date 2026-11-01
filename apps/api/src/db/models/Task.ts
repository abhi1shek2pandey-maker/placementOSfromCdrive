import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskResource {
  title: string;
  url: string;
}

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId | null;
  title: string;
  description: string;
  category:
    | 'DSA'
    | 'Core CS'
    | 'Backend'
    | 'System Design'
    | 'GenAI'
    | 'DevOps'
    | 'Placement'
    | 'Project'
    | 'Hackathon';
  priority: 'critical' | 'high' | 'medium' | 'low';
  trackId: mongoose.Types.ObjectId | null;
  topicId: mongoose.Types.ObjectId | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  estimatedMinutes: number;
  deadline: Date | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled';
  completionCriteria: string;
  expectedOutcome: string;
  resources: ITaskResource[];
  dependencies: mongoose.Types.ObjectId[];
  isMajorTask: boolean;
  whySelected: string;
  carriedForwardFrom: mongoose.Types.ObjectId | null;
  carriedForwardCount: number;
  actualMinutes: number | null;
  completedAt: Date | null;
  skipReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'DailyPlan', default: null, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['DSA', 'Core CS', 'Backend', 'System Design', 'GenAI', 'DevOps', 'Placement', 'Project', 'Hackathon'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    trackId: { type: Schema.Types.ObjectId, ref: 'LearningTrack', default: null },
    topicId: { type: Schema.Types.ObjectId, ref: 'LearningTopic', default: null },
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    estimatedMinutes: { type: Number, required: true, min: 5 },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'rescheduled'],
      default: 'pending',
    },
    completionCriteria: { type: String, required: true },
    expectedOutcome: { type: String, required: true },
    resources: [{ title: String, url: String, _id: false }],
    dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    isMajorTask: { type: Boolean, default: false },
    whySelected: { type: String, default: '' },
    carriedForwardFrom: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    carriedForwardCount: { type: Number, default: 0 },
    actualMinutes: { type: Number, default: null },
    completedAt: { type: Date, default: null },
    skipReason: { type: String, default: '' },
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, deadline: 1 });
TaskSchema.index({ userId: 1, planId: 1 });
TaskSchema.index({ carriedForwardCount: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
