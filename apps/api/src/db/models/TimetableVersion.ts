import mongoose, { Document, Schema } from 'mongoose';

export interface IClassSlot {
  start: string;
  end: string;
  label: string;
  type: 'class' | 'unavailable';
}

export interface ITimetableException {
  date: Date;
  type: 'holiday' | 'extra_class' | 'custom';
  note: string;
  slots: Array<{ start: string; end: string }>;
}

export type WeeklyScheduleDoc = {
  monday: IClassSlot[];
  tuesday: IClassSlot[];
  wednesday: IClassSlot[];
  thursday: IClassSlot[];
  friday: IClassSlot[];
  saturday: IClassSlot[];
  sunday: IClassSlot[];
};

export interface ITimetableVersion extends Document {
  userId: mongoose.Types.ObjectId;
  version: number;
  label: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  weeklySchedule: WeeklyScheduleDoc;
  exceptions: ITimetableException[];
  createdAt: Date;
}

const ClassSlotSchema = new Schema<IClassSlot>(
  { start: String, end: String, label: String, type: { type: String, enum: ['class', 'unavailable'] } },
  { _id: false }
);

const ExceptionSchema = new Schema<ITimetableException>(
  {
    date: Date,
    type: { type: String, enum: ['holiday', 'extra_class', 'custom'] },
    note: String,
    slots: [{ start: String, end: String, _id: false }],
  },
  { _id: false }
);

const TimetableVersionSchema = new Schema<ITimetableVersion>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    version: { type: Number, required: true },
    label: { type: String, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    weeklySchedule: {
      monday: { type: [ClassSlotSchema], default: [] },
      tuesday: { type: [ClassSlotSchema], default: [] },
      wednesday: { type: [ClassSlotSchema], default: [] },
      thursday: { type: [ClassSlotSchema], default: [] },
      friday: { type: [ClassSlotSchema], default: [] },
      saturday: { type: [ClassSlotSchema], default: [] },
      sunday: { type: [ClassSlotSchema], default: [] },
    },
    exceptions: { type: [ExceptionSchema], default: [] },
  },
  { timestamps: true }
);

// Compound index: userId + effectiveFrom to quickly find active timetable
TimetableVersionSchema.index({ userId: 1, effectiveFrom: 1 });

export const TimetableVersion = mongoose.model<ITimetableVersion>(
  'TimetableVersion',
  TimetableVersionSchema
);
