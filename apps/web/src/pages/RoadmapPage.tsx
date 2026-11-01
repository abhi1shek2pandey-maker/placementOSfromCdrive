import { useEffect, useState } from 'react';
import { roadmapApi } from '../api/client';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Loader2,
  Star,
  Clock,
  BarChart3,
} from 'lucide-react';

interface Topic {
  _id: string;
  name: string;
  category: string;
  proficiencyState: 'not_started' | 'learning' | 'practiced' | 'interview_ready' | 'needs_revision';
  estimatedHours: number;
  completedHours: number;
  nextRevisionAt?: string;
  lastPracticedAt?: string;
  resources: Array<{ title: string; url: string; type: string }>;
}

interface Track {
  _id: string;
  name: string;
  priority: number;
  targetOutcome: string;
  topics: Topic[];
}

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

const STATE_CONFIG: Record<
  Topic['proficiencyState'],
  { label: string; color: string; cls: string }
> = {
  not_started:    { label: 'Not Started',    color: 'var(--text-dim)',    cls: 'state--dim'      },
  learning:       { label: 'Learning',       color: 'var(--blue)',        cls: 'state--blue'     },
  practiced:      { label: 'Practiced',      color: 'var(--green)',       cls: 'state--green'    },
  interview_ready:{ label: 'Interview Ready',color: 'var(--accent-1)',    cls: 'state--accent'   },
  needs_revision: { label: 'Needs Revision', color: 'var(--yellow)',      cls: 'state--yellow'   },
};

function TopicRow({ topic }: { topic: Topic }) {
  const cfg = STATE_CONFIG[topic.proficiencyState] ?? STATE_CONFIG.not_started;
  const pct = topic.estimatedHours > 0
    ? Math.min(100, Math.round((topic.completedHours / topic.estimatedHours) * 100))
    : 0;

  return (
    <div className={`topic-row ${cfg.cls}`}>
      <div className="topic-status-dot" style={{ background: cfg.color }} />
      <div className="topic-body">
        <div className="topic-name">{topic.name}</div>
        <div className="topic-meta">
          <span className="topic-category">{topic.category}</span>
          {topic.estimatedHours > 0 && (
            <span className="topic-hours">
              <Clock size={11} /> {topic.completedHours.toFixed(1)}/{topic.estimatedHours}h
            </span>
          )}
          {topic.nextRevisionAt && topic.proficiencyState === 'needs_revision' && (
            <span className="topic-revision">
              <RefreshCw size={11} /> Due revision
            </span>
          )}
        </div>
        {pct > 0 && (
          <div className="topic-progress-bar">
            <div className="topic-progress-fill" style={{ width: `${pct}%`, background: cfg.color }} />
          </div>
        )}
      </div>
      <div className="topic-resources">
        {topic.resources?.slice(0, 2).map((r, i) => (
          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-chip">
            {r.title}
          </a>
        ))}
      </div>
      <span className={`state-badge ${cfg.cls}`}>{cfg.label}</span>
    </div>
  );
}

function TrackAccordion({ track, progress }: { track: Track; progress?: ProgressSummary }) {
  const [open, setOpen] = useState(track.priority <= 2);

  const pct = progress?.progressPercent ?? 0;
  const done = progress?.done ?? 0;
  const total = progress?.total ?? track.topics.length;

  return (
    <div className="track-accordion">
      <button
        className="track-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="track-header-left">
          <span className="track-priority">#{track.priority}</span>
          <span className="track-name">{track.name}</span>
          <div className="track-mini-bar">
            <div className="track-mini-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="track-pct">{pct}%</span>
        </div>
        <div className="track-header-right">
          <span className="track-count">{done}/{total} topics</span>
          {progress && progress.needsRevision > 0 && (
            <span className="badge badge--yellow">{progress.needsRevision} revision</span>
          )}
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {open && (
        <div className="track-body">
          {track.targetOutcome && (
            <p className="track-outcome">{track.targetOutcome}</p>
          )}
          <div className="topic-list">
            {track.topics.length === 0 ? (
              <p className="empty-text">No topics seeded yet. Run the seed script.</p>
            ) : (
              track.topics.map((t) => <TopicRow key={t._id} topic={t} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RoadmapPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [progress, setProgress] = useState<ProgressSummary[]>([]);
  const [dueRevisions, setDueRevisions] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Topic['proficiencyState'] | 'all'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [tracksRes, progressRes, revRes] = await Promise.all([
          roadmapApi.getAll(),
          roadmapApi.getProgress(),
          roadmapApi.getDueRevisions(),
        ]);
        setTracks(tracksRes.data.data);
        setProgress(progressRes.data.data);
        setDueRevisions(revRes.data.data);
      } catch {
        setError('Failed to load roadmap.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="page-loading">
      <Loader2 size={32} className="spin" />
      <span>Loading roadmap…</span>
    </div>
  );

  if (error) return (
    <div className="page-error">
      <AlertCircle size={32} />
      <p>{error}</p>
    </div>
  );

  const filteredTracks: Track[] = filter === 'all'
    ? tracks
    : tracks.map((t) => ({
        ...t,
        topics: t.topics.filter((tp) => tp.proficiencyState === filter),
      })).filter((t) => t.topics.length > 0);

  const totalTopics = progress.reduce((s, p) => s + p.total, 0);
  const doneTopics  = progress.reduce((s, p) => s + p.done, 0);
  const overallPct  = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  return (
    <div className="page roadmap-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Learning Roadmap</h1>
          <p className="page-subtitle">
            {doneTopics}/{totalTopics} topics complete · {overallPct}% overall
          </p>
        </div>
      </div>

      {/* Due revisions alert */}
      {dueRevisions.length > 0 && (
        <div className="alert alert--yellow">
          <RefreshCw size={16} />
          <div>
            <strong>{dueRevisions.length} topics need revision today</strong>
            <span className="alert-topics">
              {dueRevisions.slice(0, 3).map((t) => t.name).join(', ')}
              {dueRevisions.length > 3 && ` +${dueRevisions.length - 3} more`}
            </span>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="roadmap-stats">
        {progress.map((p) => (
          <div key={p.trackId} className="track-stat-card">
            <div className="track-stat-header">
              <span className="track-stat-name">{p.name}</span>
              <span className="track-stat-pct">{p.progressPercent}%</span>
            </div>
            <div className="track-stat-bar">
              <div className="track-stat-fill" style={{ width: `${p.progressPercent}%` }} />
            </div>
            <div className="track-stat-counts">
              <span className="text-green">{p.done} done</span>
              {p.inProgress > 0 && <span className="text-blue">{p.inProgress} learning</span>}
              {p.needsRevision > 0 && <span className="text-yellow">{p.needsRevision} revision</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-bar">
        {(['all', 'not_started', 'learning', 'practiced', 'interview_ready', 'needs_revision'] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATE_CONFIG[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Tracks */}
      <div className="tracks-list">
        {filteredTracks.map((track) => (
          <TrackAccordion
            key={track._id}
            track={track}
            progress={progress.find((p) => p.trackId === track._id)}
          />
        ))}
      </div>
    </div>
  );
}
