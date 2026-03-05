import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { toast } from '../hooks/useToast';

interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_value: number | boolean;
  description: string;
}

interface SystemSetting {
  setting_key: string;
  setting_value: string;
}

const HIDDEN_FLAG_KEYS = new Set(['feed_swipe_timer_enabled']);
const HIDDEN_SETTING_KEYS = new Set(['feed_swipe_timer_seconds', 'feed_swipe_timer_opacity']);

export default function Settings() {
  const api = useApi();

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagsError, setFlagsError] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFlagsError('');
    setSettingsError('');

    const [fr, sr] = await Promise.all([
      api<FeatureFlag[]>('GET', '/feature-flags'),
      api<SystemSetting[]>('GET', '/settings'),
    ]);

    if (fr.success && fr.data) {
      setFlags(fr.data);
    } else {
      setFlags([]);
      setFlagsError(fr.error || 'Failed to load');
    }

    if (sr.success && sr.data) {
      setSettings(sr.data);
    } else {
      setSettings([]);
      setSettingsError(sr.error || 'Failed to load');
    }

    setLoading(false);
  }, [api]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const toggleFlag = async (key: string, value: boolean) => {
    const r = await api('PUT', `/feature-flags/${encodeURIComponent(key)}`, { flag_value: value });
    if (!r.success) {
      toast(r.error || 'Failed to update flag', 'error');
      void loadSettings();
      return;
    }
    toast(`Flag "${key}" ${value ? 'enabled' : 'disabled'}`);
    void loadSettings();
  };

  const openEditSetting = (key: string, value: string) => {
    setEditKey(key);
    setEditValue(value);
    setEditOpen(true);
  };

  const closeEditSetting = () => {
    setEditOpen(false);
    setEditKey('');
    setEditValue('');
    setEditSaving(false);
  };

  const submitEditSetting = async () => {
    if (!editKey) return;
    setEditSaving(true);
    const r = await api('PUT', `/settings/${encodeURIComponent(editKey)}`, { setting_value: editValue });
    setEditSaving(false);
    if (!r.success) {
      toast(r.error || 'Failed to update setting', 'error');
      return;
    }
    closeEditSetting();
    toast('Setting updated');
    void loadSettings();
  };

  const visibleFlags = flags.filter((f) => !HIDDEN_FLAG_KEYS.has(f.flag_key));
  const visibleSettings = settings.filter((s) => !HIDDEN_SETTING_KEYS.has(s.setting_key));

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Feature flags, system settings and operational tools</p>
      </div>

      <h3 style={{ marginBottom: 16 }}>Feature Flags</h3>
      <div className="table-wrap" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr><th>Flag</th><th>Description</th><th>Status</th><th>Toggle</th></tr>
          </thead>
          <tbody>
            {loading && (
              <tr className="loading-row"><td colSpan={4}><div className="spinner" /></td></tr>
            )}
            {!loading && !!flagsError && (
              <tr className="empty-row"><td colSpan={4}>Failed to load</td></tr>
            )}
            {!loading && !flagsError && visibleFlags.length === 0 && (
              <tr className="empty-row"><td colSpan={4}>No feature flags available</td></tr>
            )}
            {!loading && !flagsError && visibleFlags.map((f) => {
              const isOn = Boolean(Number(f.flag_value));
              return (
                <tr key={f.id || f.flag_key}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{f.flag_key}</td>
                  <td style={{ color: 'var(--muted)' }}>{f.description || '-'}</td>
                  <td><span className={`badge ${isOn ? 'badge-green' : 'badge-red'}`}>{isOn ? 'ON' : 'OFF'}</span></td>
                  <td>
                    <label className="toggle">
                      <input type="checkbox" checked={isOn} onChange={(e) => toggleFlag(f.flag_key, e.target.checked)} />
                      <span className="slider" />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 16 }}>System Settings</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Setting</th><th>Value</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading && (
              <tr className="loading-row"><td colSpan={3}><div className="spinner" /></td></tr>
            )}
            {!loading && !!settingsError && (
              <tr className="empty-row"><td colSpan={3}>Failed to load</td></tr>
            )}
            {!loading && !settingsError && visibleSettings.length === 0 && (
              <tr className="empty-row"><td colSpan={3}>No system settings available</td></tr>
            )}
            {!loading && !settingsError && visibleSettings.map((s) => (
              <tr key={s.setting_key}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{s.setting_key}</td>
                <td style={{ color: 'var(--muted)' }}>{s.setting_value || '-'}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEditSetting(s.setting_key, s.setting_value || '')}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`modal-overlay ${editOpen ? 'open' : ''}`} onClick={closeEditSetting}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Edit Setting</h2>
          <input type="hidden" value={editKey} readOnly />
          <div className="form-row">
            <label>{editKey || 'Setting'}</label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submitEditSetting(); }}
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeEditSetting}>Cancel</button>
            <button className="btn btn-primary" onClick={submitEditSetting} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
