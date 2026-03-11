'use client';

import { useState, useEffect } from 'react';
import type { Database } from '@junction/database';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];

const tabs = [
  { id: 'appearance', name: 'Appearance' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'agents', name: 'Agents' },
  { id: 'profile', name: 'Profile' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data.settings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      const data = await response.json();
      setSettings(data.settings);
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium">Appearance</h3>
              <p className="text-sm text-muted-foreground">
                Customize how Junction looks and feels
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={settings.theme || 'system'}
                  onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose your preferred color theme
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Compact Mode</label>
                  <p className="text-xs text-muted-foreground">
                    Use a more condensed layout
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ compact_mode: !settings.compact_mode })}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.compact_mode ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.compact_mode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium">Task Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure default task preferences
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Priority</label>
                <select
                  value={settings.default_task_priority || 'medium'}
                  onChange={(e) => updateSettings({ default_task_priority: e.target.value as any })}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Type</label>
                <select
                  value={settings.default_task_type || 'work'}
                  onChange={(e) => updateSettings({ default_task_type: e.target.value as any })}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Task Notifications</label>
                  <p className="text-xs text-muted-foreground">
                    Get notified about task updates
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ task_notifications_enabled: !settings.task_notifications_enabled })}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.task_notifications_enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.task_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Digest</label>
                <select
                  value={settings.task_email_digest || 'daily'}
                  onChange={(e) => updateSettings({ task_email_digest: e.target.value as any })}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Receive task summaries via email
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium">Agent Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure agent behavior and notifications
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Agent Notifications</label>
                  <p className="text-xs text-muted-foreground">
                    Get notified about agent activity
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ agent_notifications_enabled: !settings.agent_notifications_enabled })}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.agent_notifications_enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.agent_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Auto-approve Agent Tasks</label>
                  <p className="text-xs text-muted-foreground">
                    Automatically approve tasks created by agents
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ agent_auto_approve_tasks: !settings.agent_auto_approve_tasks })}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.agent_auto_approve_tasks ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.agent_auto_approve_tasks ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Cost Alerts</label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when costs exceed threshold
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ agent_cost_alerts_enabled: !settings.agent_cost_alerts_enabled })}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.agent_cost_alerts_enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.agent_cost_alerts_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.agent_cost_alerts_enabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">Cost Alert Threshold (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.agent_cost_alert_threshold || 10}
                    onChange={(e) => updateSettings({ agent_cost_alert_threshold: parseFloat(e.target.value) })}
                    onBlur={(e) => updateSettings({ agent_cost_alert_threshold: parseFloat(e.target.value) })}
                    disabled={saving}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Receive an alert when agent costs exceed this amount
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium">Profile Settings</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account information
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-muted-foreground">
                Profile settings coming soon. You can manage your email and password through Supabase for now.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
