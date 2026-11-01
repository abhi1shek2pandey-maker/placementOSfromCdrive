import { useEffect, useState } from 'react';
import { plansApi, tasksApi } from '../api/client';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  PlayCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

interface Plan {
  _id: string;
  date: string;
  planSummary: string;
  status: string;
  totalAvailableMinutes: number;
  allocatedMinutes: number;
  bufferMinutes: number;
  validationStatus: string;
  validationNotes: string[];
  tasks: Task[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtMin(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h === 0 ? `${min}m` : min === 0 ? `${h}h` : `${h}h ${min}m`;
}

const CAT_COLOR: Record<string, string> = {
  DSA: '#6366f1', 'Core CS': '#06b6d4', Backend: '#10b981',
  'System Design': '#f59e0b', GenAI: '#8b5cf6',
  DevOps: '#3b82f6', Placement: '#ef4444', Project: '#8b5cf6', Hackathon: '#06b6d4',
};

function TaskCard({ task, onAction }: { task: Task; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`plan-task-card plan-task-card--${task.status}`}
      style={{ borderLeftColor: CAT_COLOR[task.category] ?? '#6366f1' }}
    >
      <div className="plan-task-top" onClick={() => setExpanded((v) => !v)}>
        <div className="plan-task-icon">
          {task.status === 'completed' ? <CheckCircle2 size={22} className="icon-green" />
            : task.status === 'in_progress' ? <PlayCircle size={22} className="icon-blue pulse" />
            : task.status === 'skipped' ? <SkipForward size={22} className="icon-dim" />
            : <Circle size={22} className="icon-dim" />}
        </div>
        <div className="plan-task-info">
          <div className="plan-task-title-row">
            <span className={`plan-task-title ${task.status === 'completed' ? 'done-text' : ''}`}>
              {task.title}
            </span>
            {task.isMajorTask && <span className="major-badge">MAJOR</span>}
          </div>
          <div className="plan-task-meta">
            <span className="cat-chip" style={{ color: CAT_COLOR[task.category] }}>
              {task.category}
            </span>
            <span className="time-chip"><Clock size={11} /> {fmt(task.scheduledStart)} – {fmt(task.scheduledEnd)}</span>
            <span className="dur-chip">{fmtMin(task.estimatedMinutes)}</span>
          </div>
        </div>
        <button className="expand-btn" aria-label="Toggle details">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="plan-task-detail">
          <p className="plan-task-desc">{task.description}</p>
          {task.whySelected && (
            <div className="plan-task-why">
              <strong>Why today:</strong> {task.whySelected}
            </div>
          )}
          <div className="plan-task-criteria">
            <strong>Done when:</strong> {task.completionCriteria}
          </div>
          {task.resources?.length > 0 && (
            <div className="plan-task-resources">
              {task.resources.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-chip">
                  <ExternalLink size={11} /> {r.title}
                </a>
              ))}
            </div>
          )}
          <div className="plan-task-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-sm btn-primary"
              onClick={onAction}
            >
              Manage Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlansPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await plansApi.getToday();
      setPlan(res.data.data);
    } catch {
      setError('Could not load today\'s plan. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (taskId: string, status: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(taskId);
    try {
      await tasksApi.updateStatus(taskId, { status, ...extra } as any);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="page-loading">
      <Loader2 size={32} className="spin" />
      <span>Loading plan…</span>
    </div>
  );

  if (error) return (
    <div className="page-error">
      <AlertCircle size={32} />
      <p>{error}</p>
      <button className="btn btn-primary" onClick={load}>Retry</button>
    </div>
  );

  const tasks = plan?.tasks ?? [];
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className="page plans-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Plan</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCheckIn(true)}>
          <Calendar size={16} />
          {plan ? 'Replan' : 'Generate Plan'}
        </button>
      </div>

      {!plan ? (
        <div className="card empty-plan">
          <Calendar size={48} className="icon-dim" />
          <h2>No plan for today</h2>
          <p>Generate your personalized daily plan to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowCheckIn(true)}>
            Generate Plan
          </button>
        </div>
      ) : (
        <>
          {/* Plan summary card */}
          <div className="card plan-summary-card">
            <div className="plan-meta-row">
              <div className="plan-meta-item">
                <span className="plan-meta-label">Available</span>
                <span className="plan-meta-value">{fmtMin(plan.totalAvailableMinutes)}</span>
              </div>
              <div className="plan-meta-item">
                <span className="plan-meta-label">Allocated</span>
                <span className="plan-meta-value">{fmtMin(plan.allocatedMinutes)}</span>
              </div>
              <div className="plan-meta-item">
                <span className="plan-meta-label">Buffer</span>
                <span className="plan-meta-value">{fmtMin(plan.bufferMinutes)}</span>
              </div>
              <div className="plan-meta-item">
                <span className="plan-meta-label">Progress</span>
                <span className="plan-meta-value">{completed}/{tasks.length} ({pct}%)</span>
              </div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            {plan.planSummary && (
              <p className="plan-summary-text">{plan.planSummary}</p>
            )}
            {plan.validationStatus === 'repaired' && (
              <div className="alert alert--yellow" style={{ marginTop: '0.75rem' }}>
                <AlertCircle size={14} />
                <span>Plan was auto-repaired to fit your schedule.</span>
              </div>
            )}
          </div>

          {/* Task list */}
          <div className="plan-tasks-section">
            <h2 className="section-title">Tasks ({tasks.length})</h2>
            <div className="plan-task-list">
              {tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onAction={() => setSelectedTask(task)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {showCheckIn && (
        <CheckInModal
          onClose={() => setShowCheckIn(false)}
          onPlanGenerated={() => { setShowCheckIn(false); load(); }}
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
