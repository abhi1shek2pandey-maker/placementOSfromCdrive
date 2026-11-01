import { useState } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  SkipForward,
  PlayCircle,
  Clock,
  Target,
  Lightbulb,
  Loader2,
} from 'lucide-react';

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

interface Props {
  task: Task;
  onClose: () => void;
  onStatusChange: (status: string, extra?: Record<string, unknown>) => Promise<void>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TaskDetailModal({ task, onClose, onStatusChange }: Props) {
  const [skipReason, setSkipReason] = useState('');
  const [actualMinutes, setActualMinutes] = useState('');
  const [selfRating, setSelfRating] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [showSkipForm, setShowSkipForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const act = async (status: string, extra: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      await onStatusChange(status, extra);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="task-category-dot" />
            <h2 className="modal-title">{task.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Meta strip */}
          <div className="task-detail-meta">
            <span className="badge badge--accent">{task.category}</span>
            <span className={`badge badge--${task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'yellow' : 'blue'}`}>
              {task.priority}
            </span>
            {task.isMajorTask && <span className="badge badge--purple">MAJOR TASK</span>}
            <span className="task-time-info">
              <Clock size={13} />
              {formatTime(task.scheduledStart)} – {formatTime(task.scheduledEnd)} ({formatMinutes(task.estimatedMinutes)})
            </span>
          </div>

          {/* Description */}
          <p className="task-description">{task.description}</p>

          {/* Why selected */}
          {task.whySelected && (
            <div className="info-block info-block--accent">
              <Lightbulb size={15} />
              <div>
                <strong>Why today?</strong>
                <p>{task.whySelected}</p>
              </div>
            </div>
          )}

          {/* Completion criteria */}
          <div className="info-block info-block--green">
            <Target size={15} />
            <div>
              <strong>Done when:</strong>
              <p>{task.completionCriteria}</p>
            </div>
          </div>

          {/* Expected outcome */}
          {task.expectedOutcome && (
            <div className="info-block info-block--dim">
              <CheckCircle2 size={15} />
              <div>
                <strong>Expected outcome:</strong>
                <p>{task.expectedOutcome}</p>
              </div>
            </div>
          )}

          {/* Resources */}
          {task.resources?.length > 0 && (
            <div className="resources-section">
              <h4 className="section-label">Learning resources</h4>
              <div className="resource-list">
                {task.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-link"
                  >
                    <ExternalLink size={13} />
                    {r.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Complete form */}
          {showCompleteForm && (
            <div className="action-form">
              <div className="form-group">
                <label className="form-label">Actual time spent (minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(e.target.value)}
                  placeholder={String(task.estimatedMinutes)}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Self-rating (1–5)</label>
                <div className="rating-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rating-btn ${selfRating === n ? 'rating-btn--active' : ''}`}
                      onClick={() => setSelfRating(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes / what you learned (optional)</label>
                <textarea
                  className="form-input form-textarea"
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Key insights, struggles, or observations…"
                />
              </div>
            </div>
          )}

          {/* Skip form */}
          {showSkipForm && (
            <div className="action-form">
              <div className="form-group">
                <label className="form-label">Why are you skipping this?</label>
                <textarea
                  className="form-input form-textarea"
                  rows={2}
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Not enough time / Too tired / Urgent work came up…"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-footer">
          {task.status === 'pending' && !showCompleteForm && !showSkipForm && (
            <>
              <button
                id="task-detail-start"
                className="btn btn-primary"
                disabled={loading}
                onClick={() => act('in_progress')}
              >
                {loading ? <Loader2 size={15} className="spin" /> : <PlayCircle size={15} />}
                Start Task
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSkipForm(true)}
              >
                <SkipForward size={15} /> Skip
              </button>
            </>
          )}

          {task.status === 'in_progress' && !showCompleteForm && !showSkipForm && (
            <>
              <button
                id="task-detail-complete"
                className="btn btn-success"
                onClick={() => setShowCompleteForm(true)}
              >
                <CheckCircle2 size={15} /> Mark as Done
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSkipForm(true)}
              >
                <SkipForward size={15} /> Skip
              </button>
            </>
          )}

          {showCompleteForm && (
            <>
              <button
                className="btn btn-success"
                disabled={loading}
                onClick={() =>
                  act('completed', {
                    actualMinutes: actualMinutes ? parseInt(actualMinutes) : task.estimatedMinutes,
                    selfRating,
                    feedback: feedback || undefined,
                  })
                }
              >
                {loading ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
                Confirm Complete
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCompleteForm(false)}>
                Back
              </button>
            </>
          )}

          {showSkipForm && (
            <>
              <button
                className="btn btn-danger"
                disabled={loading}
                onClick={() =>
                  act('skipped', { skipReason: skipReason || 'No reason given' })
                }
              >
                {loading ? <Loader2 size={15} className="spin" /> : <SkipForward size={15} />}
                Confirm Skip
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSkipForm(false)}>
                Back
              </button>
            </>
          )}

          {task.status === 'completed' && (
            <div className="completed-banner">
              <CheckCircle2 size={18} className="icon-green" />
              <span>This task is completed. Great work!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
