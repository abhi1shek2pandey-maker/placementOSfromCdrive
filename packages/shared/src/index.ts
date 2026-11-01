// ============================================================
// PlacementOS — Shared Types
// Used by both @placementos/api and @placementos/web
// ============================================================

// ── Enumerations ─────────────────────────────────────────────

export type TaskCategory =
  | 'DSA'
  | 'Core CS'
  | 'Backend'
  | 'System Design'
  | 'GenAI'
  | 'DevOps'
  | 'Placement'
  | 'Project'
  | 'Hackathon';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'rescheduled';

export type ProficiencyState =
  | 'not_started'
  | 'learning'
  | 'practiced'
  | 'interview_ready'
  | 'needs_revision';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type OpportunityType = 'hackathon' | 'internship' | 'job' | 'contest';

export type ApplicationStatus =
  | 'discovered'
  | 'interested'
  | 'applied'
  | 'rejected'
  | 'completed'
  | 'ignored';

export type NotificationType =
  | 'daily_plan'
  | 'task_start'
  | 'task_reminder'
  | 'daily_review'
  | 'weekly_review'
  | 'opportunity_alert'
  | 'recovery';

export type NotificationStatus =
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'skipped';

export type PlanStatus = 'draft' | 'active' | 'completed' | 'failed';

export type ValidationStatus = 'valid' | 'invalid' | 'repaired';

export type ProjectStatus = 'active' | 'paused' | 'completed';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

// ── Time Utilities ───────────────────────────────────────────

/** HH:MM 24-hour string, e.g. "06:00" */
export type TimeString = string;

/** ISO 8601 date string */
export type ISODate = string;

export interface TimeBlock {
  start: TimeString;
  end: TimeString;
  label?: string;
  durationMinutes?: number;
}

// ── User Profile ─────────────────────────────────────────────

export interface MealBlock {
  start: TimeString;
  end: TimeString;
  label: string;
}

export interface UserConfig {
  wakeUpTime: TimeString;
  bedtime: TimeString;
  planDeliveryTime: TimeString;
  maxMajorTasks: number;
  bufferPercent: number;
  studyDaysPerWeek: number;
  mealBlocks: MealBlock[];
  travelMinutes: number;
}

export interface NotificationConfig {
  telegramChatId: string;
  quietHoursStart: TimeString;
  quietHoursEnd: TimeString;
  enabled: boolean;
  reminderIntervalMinutes: number;
}

export interface CareerGoals {
  targetRoles: string[];
  targetCompanies: string[];
  targetCTC: number;
  placementDeadline: ISODate;
}

export interface UserSkill {
  name: string;
  level: SkillLevel;
}

// ── Timetable ─────────────────────────────────────────────────

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ClassSlot {
  start: TimeString;
  end: TimeString;
  label: string;
  type: 'class' | 'unavailable';
}

export type WeeklySchedule = Record<DayOfWeek, ClassSlot[]>;

export interface TimetableException {
  date: ISODate;
  type: 'holiday' | 'extra_class' | 'custom';
  note: string;
  slots: TimeBlock[];
}

// ── Learning ──────────────────────────────────────────────────

export interface LearningResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'problem_set' | 'documentation';
  estimatedMinutes: number;
}

// ── Tasks ─────────────────────────────────────────────────────

export interface TaskResource {
  title: string;
  url: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  trackId?: string;
  topicId?: string;
  scheduledStart?: ISODate;
  scheduledEnd?: ISODate;
  estimatedMinutes: number;
  deadline?: ISODate;
  status: TaskStatus;
  completionCriteria: string;
  expectedOutcome: string;
  resources: TaskResource[];
  isMajorTask: boolean;
  whySelected: string;
  carriedForwardCount: number;
  planId?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ── Daily Plan ────────────────────────────────────────────────

export interface CheckInInput {
  freeText?: string;
  availableMinutes?: number;
  energyLevel?: EnergyLevel;
  urgentDeadlines?: string[];
  unexpectedCommitments?: string[];
  pendingItems?: string[];
}

export interface DailyPlanDTO {
  id: string;
  date: ISODate;
  status: PlanStatus;
  planVersion: number;
  totalAvailableMinutes: number;
  allocatedMinutes: number;
  bufferMinutes: number;
  availableBlocks: TimeBlock[];
  tasks: TaskDTO[];
  validationStatus: ValidationStatus;
  validationNotes: string[];
  generatedAt: ISODate;
  deliveredAt?: ISODate;
}

// ── Learning Roadmap ──────────────────────────────────────────

export interface LearningTopicDTO {
  id: string;
  trackId: string;
  name: string;
  category: string;
  proficiencyState: ProficiencyState;
  estimatedHours: number;
  completedHours: number;
  lastPracticedAt?: ISODate;
  nextRevisionAt?: ISODate;
  resources: LearningResource[];
  prerequisites: string[];
  notes?: string;
}

export interface LearningTrackDTO {
  id: string;
  name: string;
  priority: number;
  targetOutcome: string;
  overallProgressPercent: number;
  topics: LearningTopicDTO[];
}

// ── API Response Wrappers ─────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Dashboard ─────────────────────────────────────────────────

export interface DashboardData {
  todayPlan: DailyPlanDTO | null;
  currentTask: TaskDTO | null;
  upcomingTasks: TaskDTO[];
  completedTodayCount: number;
  totalTodayCount: number;
  focusedMinutesToday: number;
  upcomingDeadlines: Array<{ title: string; deadline: ISODate; type: string }>;
  weeklyStats: {
    tasksCompleted: number;
    tasksTotal: number;
    focusedMinutes: number;
    completionRate: number;
  };
}
