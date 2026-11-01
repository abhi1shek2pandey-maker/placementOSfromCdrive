import { useEffect, useState } from 'react';
import { dashboardApi, roadmapApi } from '../api/client';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  AlertCircle,
  BookOpen,
  Flame,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

interface ProgressSummary {
  trackId: string;
  name: string;
  priority: number;
  total: number;
  done: number;
  inProgress: number;
  needsRevision: number;
  progressPercent: number;
}

interface DashData {
  weeklyStats: {
    tasksCompleted: number;
    tasksTotal: number;
    focusedMinutes: number;
    completionRate: number;
  };
  focusedMinutesToday: number;
  completedTodayCount: number;
  totalTodayCount: number;
}

const TRACK_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444'];

const STATE_COLORS: Record<string, string> = {
  done: '#10b981',
  inProgress: '#3b82f6',
  needsRevision: '#f59e0b',
  notStarted: '#1e1e2e',
};

function fmtMin(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h === 0 ? `${min}m` : min === 0 ? `${h}h` : `${h}h ${min}m`;
}

export function ProgressPage() {
  const [dash, setDash] = useState<DashData | null>(null);
  const [progress, setProgress] = useState<ProgressSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dashRes, progressRes] = await Promise.all([
          dashboardApi.get(),
          roadmapApi.getProgress(),
        ]);
        setDash(dashRes.data.data);
        setProgress(progressRes.data.data);
      } catch {
        setError('Failed to load progress data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="page-loading">
      <Loader2 size={32} className="spin" />
      <span>Loading progress…</span>
    </div>
  );

  if (error) return (
    <div className="page-error">
      <AlertCircle size={32} />
      <p>{error}</p>
    </div>
  );

  // Build charts data
  const trackBarData = progress.map((p, i) => ({
    name: p.name.replace('DSA & C++', 'DSA').replace('System Design', 'SD'),
    done: p.done,
    inProgress: p.inProgress,
    needsRevision: p.needsRevision,
    notStarted: Math.max(0, p.total - p.done - p.inProgress - p.needsRevision),
    color: TRACK_COLORS[i % TRACK_COLORS.length],
  }));

  // Pie chart for today's breakdown
  const totalTopics = progress.reduce((s, p) => s + p.total, 0);
  const doneTopics  = progress.reduce((s, p) => s + p.done, 0);
  const inProgTopics = progress.reduce((s, p) => s + p.inProgress, 0);
  const revTopics   = progress.reduce((s, p) => s + p.needsRevision, 0);
  const notStarted  = Math.max(0, totalTopics - doneTopics - inProgTopics - revTopics);

  const pieData = [
    { name: 'Practiced / Ready', value: doneTopics, color: '#10b981' },
    { name: 'Learning', value: inProgTopics, color: '#3b82f6' },
    { name: 'Needs Revision', value: revTopics, color: '#f59e0b' },
    { name: 'Not Started', value: notStarted, color: '#252535' },
  ].filter((d) => d.value > 0);

  const overallPct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  return (
    <div className="page progress-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Progress</h1>
          <p className="page-subtitle">Track your placement preparation journey</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon--green"><CheckCircle2 size={18} /></div>
          <div>
            <div className="stat-value">{dash?.weeklyStats.tasksCompleted ?? 0}</div>
            <div className="stat-label">Tasks this week</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue"><Clock size={18} /></div>
          <div>
            <div className="stat-value">{fmtMin(dash?.weeklyStats.focusedMinutes ?? 0)}</div>
            <div className="stat-label">Focused this week</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--yellow"><Flame size={18} /></div>
          <div>
            <div className="stat-value">{dash?.weeklyStats.completionRate ?? 0}%</div>
            <div className="stat-label">Completion rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--accent"><BookOpen size={18} /></div>
          <div>
            <div className="stat-value">{overallPct}%</div>
            <div className="stat-label">Roadmap covered</div>
          </div>
        </div>
      </div>

      <div className="progress-charts-grid">
        {/* Track progress bar chart */}
        <div className="card chart-card">
          <div className="card-header">
            <BarChart3 size={16} className="icon-accent" />
            <h3 className="card-title">Topics by Track</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trackBarData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              />
              <Bar dataKey="done" name="Done" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="inProgress" name="Learning" stackId="a" fill="#3b82f6" />
              <Bar dataKey="needsRevision" name="Needs Revision" stackId="a" fill="#f59e0b" />
              <Bar dataKey="notStarted" name="Not Started" stackId="a" fill="#252535" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overall pie chart */}
        <div className="card chart-card">
          <div className="card-header">
            <Target size={16} className="icon-accent" />
            <h3 className="card-title">Roadmap Overview</h3>
          </div>
          <div className="pie-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-label">
              <span className="pie-pct">{overallPct}%</span>
              <span className="pie-sub">covered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-track detail table */}
      <div className="card">
        <div className="card-header">
          <TrendingUp size={16} className="icon-accent" />
          <h3 className="card-title">Track Breakdown</h3>
        </div>
        <div className="track-table">
          <div className="track-table-header">
            <span>Track</span>
            <span>Total</span>
            <span>Done</span>
            <span>Learning</span>
            <span>Revision</span>
            <span>Progress</span>
          </div>
          {progress.map((p, i) => (
            <div key={p.trackId} className="track-table-row">
              <span className="track-table-name">
                <span className="track-dot" style={{ background: TRACK_COLORS[i] }} />
                {p.name}
              </span>
              <span>{p.total}</span>
              <span className="text-green">{p.done}</span>
              <span className="text-blue">{p.inProgress}</span>
              <span className={p.needsRevision > 0 ? 'text-yellow' : 'text-dim'}>{p.needsRevision}</span>
              <div className="track-table-bar">
                <div
                  className="track-table-fill"
                  style={{ width: `${p.progressPercent}%`, background: TRACK_COLORS[i] }}
                />
                <span className="track-table-pct">{p.progressPercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
