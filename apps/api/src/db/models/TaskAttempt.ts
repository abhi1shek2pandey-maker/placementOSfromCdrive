import mongoose, { Document, Schema } from 'mongoose';

export interface ITaskAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt: Date | null;
  actualMinutes: number | null;
  outcome: 'completed' | 'partial' | 'failed' | 'skipped';
  selfRating: 1 | 2 | 3 | 4 | 5;
  hintsUsed: number;
  solvedIndependently: boolean | null;
  mistakes: string;
  feedback: string;
  distractionMinutes: number;
}

const TaskAttemptSchema = new Schema<ITaskAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    actualMinutes: { type: Number, default: null },
    outcome: {
      type: String,
      enum: ['completed', 'partial', 'failed', 'skipped'],
      required: true,
    },
    selfRating: { type: Number, enum: [1, 2, 3, 4, 5], default: 3 },
    hintsUsed: { type: Number, default: 0 },
    solvedIndependently: { type: Boolean, default: null },
    mistakes: { type: String, default: '' },
    feedback: { type: String, default: '' },
    distractionMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const TaskAttempt = mongoose.model<ITaskAttempt>('TaskAttempt', TaskAttemptSchema);
