import { useState } from 'react';
import { plansApi } from '../api/client';
import { X, Zap, Loader2, Battery, BatteryLow, BatteryFull } from 'lucide-react';

interface Props {
  onClose: () => void;
  onPlanGenerated: () => void;
}

const ENERGY_OPTIONS = [
  { value: 'low', label: 'Low energy', icon: BatteryLow, desc: 'Tired — lighter tasks please' },
  { value: 'medium', label: 'Moderate', icon: Battery, desc: 'Normal day' },
  { value: 'high', label: 'High energy', icon: BatteryFull, desc: 'Fully charged — go deep' },
];

export function CheckInModal({ onClose, onPlanGenerated }: Props) {
  const [freeText, setFreeText] = useState('');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [urgentDeadlines, setUrgentDeadlines] = useState('');
  const [unexpectedCommitments, setUnexpectedCommitments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await plansApi.generate({
        freeText: freeText.trim() || undefined,
        energyLevel,
        urgentDeadlines: urgentDeadlines
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        unexpectedCommitments: unexpectedCommitments
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onPlanGenerated();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Plan generation failed. Check API + Gemini key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Zap size={18} className="icon-accent" />
            <h2 className="modal-title">Daily Check-in</h2>
          </div>
          <button id="checkin-close" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="modal-body">
          {/* Free text */}
          <div className="form-group">
            <label className="form-label">How's your day looking? (optional)</label>
            <textarea
              id="checkin-freetext"
              className="form-input form-textarea"
              rows={3}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g. I have 3 hours free, tired after college, hackathon submission in 2 days..."
            />
            <span className="form-hint">Describe anything — the AI will extract what matters.</span>
          </div>

          {/* Energy */}
          <div className="form-group">
            <label className="form-label">Energy level</label>
            <div className="energy-grid">
              {ENERGY_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  id={`energy-${value}`}
                  className={`energy-btn ${energyLevel === value ? 'energy-btn--active' : ''}`}
                  onClick={() => setEnergyLevel(value as any)}
                >
                  <Icon size={20} />
                  <span className="energy-label">{label}</span>
                  <span className="energy-desc">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Urgent deadlines */}
          <div className="form-group">
            <label className="form-label">Urgent deadlines today? (one per line, optional)</label>
            <textarea
              id="checkin-deadlines"
              className="form-input form-textarea"
              rows={2}
              value={urgentDeadlines}
              onChange={(e) => setUrgentDeadlines(e.target.value)}
              placeholder="Hackathon submission by 11 PM&#10;Project PR review needed"
            />
          </div>

          {/* Unexpected commitments */}
          <div className="form-group">
            <label className="form-label">Unexpected commitments? (one per line, optional)</label>
            <textarea
              id="checkin-commitments"
              className="form-input form-textarea"
              rows={2}
              value={unexpectedCommitments}
              onChange={(e) => setUnexpectedCommitments(e.target.value)}
              placeholder="Extra lab session 2–4 PM&#10;Group project meeting at 6 PM"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              id="generate-plan-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Generating plan…
                </>
              ) : (
                <>
                  <Zap size={16} /> Generate My Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
