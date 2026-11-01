import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectMilestone {
  title: string;
  dueDate: Date | null;
  status: 'pending' | 'completed';
  completedAt: Date | null;
}

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  repoUrl: string | null;
  stack: string[];
  status: 'active' | 'paused' | 'completed';
  description: string;
  milestones: IProjectMilestone[];
  deploymentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    repoUrl: { type: String, default: null },
    stack: [String],
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    description: { type: String, default: '' },
    milestones: [
      {
        title: String,
        dueDate: { type: Date, default: null },
        status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
        completedAt: { type: Date, default: null },
        _id: false,
      },
    ],
    deploymentUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
