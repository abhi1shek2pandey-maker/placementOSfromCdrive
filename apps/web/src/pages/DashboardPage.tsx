import { useEffect, useState, useCallback } from 'react';
import { dashboardApi, tasksApi, plansApi } from '../api/client';
import {
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  SkipForward,
  PlayCircle,
  RefreshCw,
  Loader2,
  Target,
  Calendar,
  BookOpen,
  Flame,
} from 'lucide-react';
import { CheckInModal } from '../components/CheckInModal';
import { TaskDetailModal } from '../components/TaskDetailModal';

interface Task {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  estimatedMinutes: number;
  completionCriteria: string;
  expectedOutcome: string;
  whySelected: string;
  isMajorTask: boolean;
  resources: Array<{ title: string; url: string }>;
}

interface DashboardData {
  todayPlan: {
    planSummary?: string;
    tasks: Task[];
    date: string;
    status: string;
    totalAvailableMinutes: number;
    allocatedMinutes: number;
  } | null;
  currentTask: Task | null;
  upcomingTasks: Task[];
  completedTodayCount: number;
  totalTodayCount: number;
  focusedMinutesToday: number;
  upcomingDeadlines: Array<{ title: string; deadline: string; type: string }>;
  weeklyStats: {
    tasksCompleted: number;
    tasksTotal: number;
    focusedMinutes: number;
    completionRate: number;
  };
  tracks: Array<{ id: string; name: string; priority: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  DSA: 'var(--accent-1)',
  'Core CS': 'var(--cyan)',
  Backend: 'var(--green)',
  'System Design': 'var(--yellow)',
  GenAI: 'var(--purple)',
  DevOps: 'var(--blue)',
  Placement: 'var(--red)',
  Project: 'var(--accent-2)',
  Hackathon: 'var(--accent-3)',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'badge badge--red',
  high: 'badge badge--yellow',
  medium: 'badge badge--blue',
  low: 'badge badge--dim',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '🌅 Good morning';
  if (h < 17) return '☀️ Good afternoon';
  return '🌙 Good evening';
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await dashboardApi.get();
      setData(res.data.data);
    } catch {
      setError('Failed to load dashboard. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (
    taskId: string,
    status: string,
    extra: Record<string, unknown> = {}
  ) => {
    setActionLoading(taskId);
    try {
      await tasksApi.updateStatus(taskId, { status, ...extra } as any);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 size={32} className="spin" />
        <span>Loading your dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <AlertTriangle size={32} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  const tasks = data?.todayPlan?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="page dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{getGreeting()}!</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button
            id="generate-plan-btn"
            className="btn btn-primary"
            onClick={() => setShowCheckIn(true)}
          >
            <Zap size={16} />
            {data?.todayPlan ? 'Replan Day' : 'Generate Plan'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="stat-value">{completedCount}/{totalCount}</div>
            <div className="stat-label">Tasks today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">
            <Clock size={18} />
          </div>
          <div>
            <div className="stat-value">{formatMinutes(data?.focusedMinutesToday ?? 0)}</div>
            <div className="stat-label">Focused today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--yellow">
            <Flame size={18} />
          </div>
          <div>
            <div className="stat-value">{data?.weeklyStats.completionRate ?? 0}%</div>
            <div className="stat-label">Weekly rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--purple">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="stat-value">{data?.weeklyStats.tasksCompleted ?? 0}</div>
            <div className="stat-label">Done this week</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left column */}
        <div className="dashboard-main">
          {/* Today's plan */}
          {!data?.todayPlan ? (
            <div className="card empty-plan">
              <div className="empty-plan-icon">
                <Target size={36} />
              </div>
              <h2>No plan for today</h2>
              <p>Generate your personalized daily plan based on your schedule, energy, and priorities.</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowCheckIn(true)}
              >
                <Zap size={16} /> Generate Today's Plan
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div className="card-header-left">
                  <Calendar size={18} className="card-icon" />
                  <h2 className="card-title">Today's Plan</h2>
                  {data.todayPlan.status && (
                    <span className={`badge badge--${data.todayPlan.status === 'active' ? 'green' : 'dim'}`}>
                      {data.todayPlan.status}
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                <div className="progress-info">
                  <span className="progress-label">{progressPercent}% done</span>
                </div>
              </div>

              {data.todayPlan.planSummary && (
                <p className="plan-summary">{data.todayPlan.planSummary}</p>
              )}

              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="task-list">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className={`task-item task-item--${task.status} ${task.isMajorTask ? 'task-item--major' : ''}`}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      borderLeftColor: task.isMajorTask
                        ? CATEGORY_COLORS[task.category] ?? 'var(--accent-1)'
                        : 'transparent',
                    }}
                  >
                    <div className="task-status-icon">
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={20} className="icon-green" />
                      ) : task.status === 'in_progress' ? (
                        <PlayCircle size={20} className="icon-blue pulse" />
                      ) : task.status === 'skipped' ? (
                        <SkipForward size={20} className="icon-dim" />
                      ) : (
                        <Circle size={20} className="icon-dim" />
                      )}
                    </div>

                    <div className="task-body">
                      <div className="task-top">
                        <span className={`task-title ${task.status === 'completed' ? 'task-title--done' : ''}`}>
                          {task.title}
                        </span>
                        {task.isMajorTask && <span className="major-badge">MAJOR</span>}
                      </div>
                      <div className="task-meta">
                        <span
                          className="cat-badge"
                          style={{ color: CATEGORY_COLORS[task.category] ?? 'var(--text-secondary)' }}
                        >
                          {task.category}
                        </span>
                        <span className="task-time">
                          {formatTime(task.scheduledStart)} – {formatTime(task.scheduledEnd)}
                        </span>
                        <span className="task-duration">
                          <Clock size={11} /> {formatMinutes(task.estimatedMinutes)}
                        </span>
                        <span className={PRIORITY_BADGE[task.priority] ?? 'badge badge--dim'}>
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                      {task.status === 'pending' && (
                        <>
                          <button
                            id={`start-task-${task._id}`}
                            className="btn btn-xs btn-ghost"
                            disabled={actionLoading === task._id}
                            onClick={() => handleStatus(task._id, 'in_progress')}
                            title="Start"
                          >
                            {actionLoading === task._id ? (
                              <Loader2 size={14} className="spin" />
                            ) : (
                              <PlayCircle size={14} />
                            )}
                          </button>
                          <button
                            id={`skip-task-${task._id}`}
                            className="btn btn-xs btn-ghost"
                            disabled={actionLoading === task._id}
                            onClick={() => handleStatus(task._id, 'skipped', { skipReason: 'Skipped from dashboard' })}
                            title="Skip"
                          >
                            <SkipForward size={14} />
                          </button>
                        </>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          id={`complete-task-${task._id}`}
                          className="btn btn-xs btn-success"
                          disabled={actionLoading === task._id}
                          onClick={() => handleStatus(task._id, 'completed')}
                          title="Mark done"
                        >
                          {actionLoading === task._id ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                        </button>
                      )}
                      <ChevronRight size={14} className="icon-dim" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="dashboard-sidebar">
          {/* Upcoming deadlines */}
          {(data?.upcomingDeadlines?.length ?? 0) > 0 && (
            <div className="card">
              <div className="card-header">
                <AlertTriangle size={16} className="icon-yellow" />
                <h3 className="card-title">Upcoming Deadlines</h3>
              </div>
              <div className="deadline-list">
                {data!.upcomingDeadlines.map((d, i) => {
                  const daysLeft = Math.ceil(
                    (new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={i} className="deadline-item">
                      <div className="deadline-dot" />
                      <div className="deadline-body">
                        <span className="deadline-title">{d.title}</span>
                        <span className={`deadline-days ${daysLeft <= 2 ? 'text-red' : 'text-yellow'}`}>
                          {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly snapshot */}
          <div className="card">
            <div className="card-header">
              <BookOpen size={16} className="icon-accent" />
              <h3 className="card-title">This Week</h3>
            </div>
            <div className="weekly-stats">
              <div className="weekly-stat-row">
                <span>Tasks completed</span>
                <strong>{data?.weeklyStats.tasksCompleted ?? 0} / {data?.weeklyStats.tasksTotal ?? 0}</strong>
              </div>
              <div className="weekly-stat-row">
                <span>Focused time</span>
                <strong>{formatMinutes(data?.weeklyStats.focusedMinutes ?? 0)}</strong>
              </div>
              <div className="weekly-stat-row">
                <span>Completion rate</span>
                <strong>{data?.weeklyStats.completionRate ?? 0}%</strong>
              </div>
            </div>
          </div>

          {/* Active tracks */}
          {(data?.tracks?.length ?? 0) > 0 && (
            <div className="card">
              <div className="card-header">
                <Target size={16} className="icon-accent" />
                <h3 className="card-title">Active Tracks</h3>
              </div>
              <div className="tracks-mini-list">
                {data!.tracks.slice(0, 5).map((t) => (
                  <div key={t.id} className="track-mini">
                    <span className="track-mini-num">{t.priority}</span>
                    <span className="track-mini-name">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCheckIn && (
        <CheckInModal
          onClose={() => setShowCheckIn(false)}
          onPlanGenerated={() => {
            setShowCheckIn(false);
            load();
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={async (status, extra) => {
            await handleStatus(selectedTask._id, status, extra);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
