import mongoose, { Document, Schema } from 'mongoose';

export interface IMealBlock {
  start: string;
  end: string;
  label: string;
}

export interface IUserConfig {
  wakeUpTime: string;
  bedtime: string;
  planDeliveryTime: string;
  maxMajorTasks: number;
  bufferPercent: number;
  studyDaysPerWeek: number;
  mealBlocks: IMealBlock[];
  travelMinutes: number;
}

export interface INotificationConfig {
  telegramChatId: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  enabled: boolean;
  reminderIntervalMinutes: number;
}

export interface ICareerGoals {
  targetRoles: string[];
  targetCompanies: string[];
  targetCTC: number;
  placementDeadline: Date;
}

export interface IUserSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  careerGoals: ICareerGoals;
  config: IUserConfig;
  notifications: INotificationConfig;
  currentSkills: IUserSkill[];
  updatedAt: Date;
  createdAt: Date;
}

const MealBlockSchema = new Schema<IMealBlock>(
  { start: String, end: String, label: String },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    careerGoals: {
      targetRoles: [String],
      targetCompanies: [String],
      targetCTC: { type: Number, default: 1500000 },
      placementDeadline: Date,
    },
    config: {
      wakeUpTime: { type: String, default: '06:00' },
      bedtime: { type: String, default: '23:30' },
      planDeliveryTime: { type: String, default: '05:00' },
      maxMajorTasks: { type: Number, default: 3 },
      bufferPercent: { type: Number, default: 20 },
      studyDaysPerWeek: { type: Number, default: 7 },
      mealBlocks: { type: [MealBlockSchema], default: [
        { start: '07:30', end: '08:00', label: 'Breakfast' },
        { start: '13:00', end: '13:30', label: 'Lunch' },
        { start: '20:00', end: '20:30', label: 'Dinner' },
      ]},
      travelMinutes: { type: Number, default: 10 },
    },
    notifications: {
      telegramChatId: { type: String, default: '' },
      quietHoursStart: { type: String, default: '23:30' },
      quietHoursEnd: { type: String, default: '06:00' },
      enabled: { type: Boolean, default: false },
      reminderIntervalMinutes: { type: Number, default: 15 },
    },
    currentSkills: [
      {
        name: String,
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
