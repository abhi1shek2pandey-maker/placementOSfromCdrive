import mongoose, { Document, Schema } from 'mongoose';

export interface IPlanningInputs {
  availableMinutes: number;
  userCheckIn: string;
  energyLevel: 'low' | 'medium' | 'high';
  urgentDeadlines: string[];
  unexpectedCommitments: string[];
}

export interface IAvailableBlock {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface IDailyPlan extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  timetableVersionId: mongoose.Types.ObjectId | null;
  planVersion: number;
  status: 'draft' | 'active' | 'completed' | 'failed';
  planningInputs: IPlanningInputs;
  availableBlocks: IAvailableBlock[];
  totalAvailableMinutes: number;
  allocatedMinutes: number;
  bufferMinutes: number;
  validationStatus: 'valid' | 'invalid' | 'repaired';
  validationNotes: string[];
  generatedAt: Date;
  deliveredAt: Date | null;
  llmModel: string;
  promptVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyPlanSchema = new Schema<IDailyPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    timetableVersionId: { type: Schema.Types.ObjectId, ref: 'TimetableVersion', default: null },
    planVersion: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'failed'],
      default: 'draft',
    },
    planningInputs: {
      availableMinutes: { type: Number, default: 0 },
      userCheckIn: { type: String, default: '' },
      energyLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      urgentDeadlines: [String],
      unexpectedCommitments: [String],
    },
    availableBlocks: [
      {
        start: String,
        end: String,
        durationMinutes: Number,
        _id: false,
      },
    ],
    totalAvailableMinutes: { type: Number, default: 0 },
    allocatedMinutes: { type: Number, default: 0 },
    bufferMinutes: { type: Number, default: 0 },
    validationStatus: {
      type: String,
      enum: ['valid', 'invalid', 'repaired'],
      default: 'valid',
    },
    validationNotes: [String],
    generatedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    llmModel: { type: String, default: '' },
    promptVersion: { type: String, default: 'v1' },
  },
  { timestamps: true }
);

// One plan per user per date (idempotency)
DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyPlan = mongoose.model<IDailyPlan>('DailyPlan', DailyPlanSchema);
