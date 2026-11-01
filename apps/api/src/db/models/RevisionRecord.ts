import mongoose, { Document, Schema } from 'mongoose';

export interface IRevisionRecord extends Document {
  userId: mongoose.Types.ObjectId;
  topicId: mongoose.Types.ObjectId;
  revisedAt: Date;
  priorProficiency: string;
  postProficiency: string;
  performanceScore: number;
  questionsAttempted: number;
  questionsCorrect: number;
  nextRevisionAt: Date;
  intervalDays: number;
  notes: string;
}

const RevisionRecordSchema = new Schema<IRevisionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'LearningTopic', required: true, index: true },
    revisedAt: { type: Date, required: true },
    priorProficiency: String,
    postProficiency: String,
    performanceScore: { type: Number, min: 0, max: 100 },
    questionsAttempted: { type: Number, default: 0 },
    questionsCorrect: { type: Number, default: 0 },
    nextRevisionAt: { type: Date, required: true },
    intervalDays: { type: Number, default: 7 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

RevisionRecordSchema.index({ userId: 1, nextRevisionAt: 1 });

export const RevisionRecord = mongoose.model<IRevisionRecord>(
  'RevisionRecord',
  RevisionRecordSchema
);
