import { useEffect, useState } from 'react';
import { profileApi } from '../api/client';
import {
  Settings,
  Bell,
  Clock,
  User,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MessageCircle,
} from 'lucide-react';

interface UserProfile {
  config: {
    wakeUpTime: string;
    bedtime: string;
    planDeliveryTime: string;
    maxMajorTasks: number;
    bufferPercent: number;
    travelMinutes: number;
    mealBlocks: Array<{ start: string; end: string; label: string }>;
  };
  notifications: {
    telegramChatId: string;
    quietHoursStart: string;
    quietHoursEnd: string;
    enabled: boolean;
    reminderIntervalMinutes: number;
  };
  careerGoals: {
    targetRoles: string[];
    targetCompanies: string[];
    targetCTC: number;
    placementDeadline: string;
  };
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="card settings-section">
      <div className="card-header">
        <Icon size={16} className="icon-accent" />
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="settings-body">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-field">
      <div className="settings-field-label">
        <span className="form-label">{label}</span>
        {hint && <span className="form-hint">{hint}</span>}
      </div>
      <div className="settings-field-input">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Local editable state
  const [config, setConfig] = useState({
    wakeUpTime: '06:00',
    bedtime: '23:30',
    planDeliveryTime: '05:00',
    maxMajorTasks: 3,
    bufferPercent: 20,
    travelMinutes: 10,
  });
  const [notif, setNotif] = useState({
    telegramChatId: '',
    quietHoursStart: '23:30',
    quietHoursEnd: '06:00',
    enabled: false,
    reminderIntervalMinutes: 15,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await profileApi.get();
        const p: UserProfile = res.data.data;
        setProfile(p);
        setConfig({
          wakeUpTime: p.config.wakeUpTime,
          bedtime: p.config.bedtime,
          planDeliveryTime: p.config.planDeliveryTime,
          maxMajorTasks: p.config.maxMajorTasks,
          bufferPercent: p.config.bufferPercent,
          travelMinutes: p.config.travelMinutes,
        });
        setNotif({
          telegramChatId: p.notifications.telegramChatId ?? '',
          quietHoursStart: p.notifications.quietHoursStart,
          quietHoursEnd: p.notifications.quietHoursEnd,
          enabled: p.notifications.enabled,
          reminderIntervalMinutes: p.notifications.reminderIntervalMinutes,
        });
      } catch {
        setError('Failed to load profile settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await Promise.all([
        profileApi.updateConfig(config as any),
        profileApi.updateNotifications(notif as any),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="page-loading">
      <Loader2 size={32} className="spin" />
      <span>Loading settings…</span>
    </div>
  );

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your schedule, preferences, and notifications</p>
        </div>
        <button
          id="settings-save-btn"
          className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 size={16} className="spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="alert alert--red">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Schedule */}
        <Section title="Daily Schedule" icon={Clock}>
          <Field label="Wake-up time" hint="Study availability starts here">
            <input
              type="time"
              className="form-input"
              value={config.wakeUpTime}
              onChange={(e) => setConfig((c) => ({ ...c, wakeUpTime: e.target.value }))}
            />
          </Field>
          <Field label="Bedtime" hint="No study blocks scheduled after this">
            <input
              type="time"
              className="form-input"
              value={config.bedtime}
              onChange={(e) => setConfig((c) => ({ ...c, bedtime: e.target.value }))}
            />
          </Field>
          <Field label="Plan delivery time" hint="AI plan generated at this time daily">
            <input
              type="time"
              className="form-input"
              value={config.planDeliveryTime}
              onChange={(e) => setConfig((c) => ({ ...c, planDeliveryTime: e.target.value }))}
            />
          </Field>
          <Field label="College travel time (minutes)">
            <input
              type="number"
              className="form-input"
              min={0}
              max={120}
              value={config.travelMinutes}
              onChange={(e) => setConfig((c) => ({ ...c, travelMinutes: +e.target.value }))}
            />
          </Field>
        </Section>

        {/* Planning */}
        <Section title="Planning Preferences" icon={Settings}>
          <Field label="Max major tasks per day" hint="Recommended: 2–3">
            <input
              type="number"
              className="form-input"
              min={1}
              max={5}
              value={config.maxMajorTasks}
              onChange={(e) => setConfig((c) => ({ ...c, maxMajorTasks: +e.target.value }))}
            />
          </Field>
          <Field
            label="Schedule buffer %"
            hint="% of free time kept unallocated (recommended: 20)"
          >
            <div className="range-wrap">
              <input
                type="range"
                min={10}
                max={40}
                step={5}
                value={config.bufferPercent}
                onChange={(e) => setConfig((c) => ({ ...c, bufferPercent: +e.target.value }))}
                className="range-input"
              />
              <span className="range-value">{config.bufferPercent}%</span>
            </div>
          </Field>
        </Section>

        {/* Notifications */}
        <Section title="Telegram Notifications" icon={MessageCircle}>
          <Field
            label="Telegram Chat ID"
            hint="Send /start to your bot, then visit api.telegram.org/bot{TOKEN}/getUpdates"
          >
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 123456789"
              value={notif.telegramChatId}
              onChange={(e) => setNotif((n) => ({ ...n, telegramChatId: e.target.value }))}
            />
          </Field>
          <Field label="Enable notifications">
            <label className="toggle-label">
              <input
                type="checkbox"
                className="toggle-input"
                checked={notif.enabled}
                onChange={(e) => setNotif((n) => ({ ...n, enabled: e.target.checked }))}
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span>{notif.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </Field>
          <Field label="Quiet hours start" hint="No notifications after this time">
            <input
              type="time"
              className="form-input"
              value={notif.quietHoursStart}
              onChange={(e) => setNotif((n) => ({ ...n, quietHoursStart: e.target.value }))}
            />
          </Field>
          <Field label="Quiet hours end" hint="Notifications resume after this time">
            <input
              type="time"
              className="form-input"
              value={notif.quietHoursEnd}
              onChange={(e) => setNotif((n) => ({ ...n, quietHoursEnd: e.target.value }))}
            />
          </Field>
          <Field label="Reminder interval (minutes)">
            <input
              type="number"
              className="form-input"
              min={5}
              max={60}
              step={5}
              value={notif.reminderIntervalMinutes}
              onChange={(e) => setNotif((n) => ({ ...n, reminderIntervalMinutes: +e.target.value }))}
            />
          </Field>
        </Section>

        {/* Career goals (read-only for now) */}
        {profile && (
          <Section title="Career Profile" icon={User}>
            <div className="career-info-grid">
              <div className="career-info-item">
                <span className="career-label">Target roles</span>
                <div className="tag-list">
                  {profile.careerGoals.targetRoles.map((r) => (
                    <span key={r} className="tag">{r}</span>
                  ))}
                </div>
              </div>
              <div className="career-info-item">
                <span className="career-label">Target companies</span>
                <div className="tag-list">
                  {profile.careerGoals.targetCompanies.map((c) => (
                    <span key={c} className="tag">{c}</span>
                  ))}
                </div>
              </div>
              <div className="career-info-item">
                <span className="career-label">Target CTC</span>
                <span className="career-value">
                  ₹{(profile.careerGoals.targetCTC / 100000).toFixed(0)} LPA
                </span>
              </div>
              {profile.careerGoals.placementDeadline && (
                <div className="career-info-item">
                  <span className="career-label">Placement deadline</span>
                  <span className="career-value">
                    {new Date(profile.careerGoals.placementDeadline).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
