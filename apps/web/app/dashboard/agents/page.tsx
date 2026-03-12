'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@orqestr/database';
import Link from 'next/link';

type Agent = Database['public']['Tables']['agents']['Row'];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerType, setRegisterType] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchAgents();

    // Subscribe to real-time updates using Supabase Realtime
    const subscription = supabase
      .channel('agents-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents'
      }, (payload) => {
        console.log('Agent change received:', payload);
        fetchAgents(); // Refresh the list
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          type: registerType,
        }),
      });

      if (!response.ok) throw new Error('Failed to register agent');

      const data = await response.json();
      setNewApiKey(data.agent.api_key);
      setShowRegisterForm(false);
      setRegisterName('');
      setRegisterType('');
      await fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete agent');

      await fetchAgents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    idle: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    waiting_for_input: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const agentCounts = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    idle: agents.filter((a) => a.status === 'idle').length,
    offline: agents.filter((a) => a.status === 'offline').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
          <p className="text-muted-foreground">
            Manage your AI agents and their tasks
          </p>
        </div>
        <button
          onClick={() => setShowRegisterForm(!showRegisterForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showRegisterForm ? 'Cancel' : 'Register Agent'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {newApiKey && (
        <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-900/10">
          <h3 className="font-semibold text-green-900 dark:text-green-400">Agent Registered Successfully!</h3>
          <p className="mt-2 text-sm text-green-800 dark:text-green-300">
            Save this API key - it won&apos;t be shown again:
          </p>
          <code className="mt-2 block rounded bg-green-100 p-2 text-sm dark:bg-green-900/30">
            {newApiKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newApiKey);
              alert('API key copied to clipboard!');
            }}
            className="mt-2 text-sm text-green-700 hover:underline dark:text-green-400"
          >
            Copy to clipboard
          </button>
          <button
            onClick={() => setNewApiKey(null)}
            className="mt-2 ml-4 text-sm text-green-700 hover:underline dark:text-green-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {showRegisterForm && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 font-semibold">Register New Agent</h3>
          <form onSubmit={handleRegisterAgent} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Agent Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="My Agent"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                Agent Type <span className="text-destructive">*</span>
              </label>
              <input
                id="type"
                type="text"
                value={registerType}
                onChange={(e) => setRegisterType(e.target.value)}
                placeholder="automation, research, coding, etc."
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={registerLoading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {registerLoading ? 'Registering...' : 'Register Agent'}
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Agents</p>
          <p className="mt-1 text-2xl font-bold">{agentCounts.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{agentCounts.active}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Idle</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{agentCounts.idle}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Offline</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">{agentCounts.offline}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No agents registered yet. Click &ldquo;Register Agent&rdquo; to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[agent.status]
                      }`}
                    >
                      {agent.status.replace('_', ' ')}
                    </span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {agent.type}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span>Last heartbeat: {formatDate(agent.last_heartbeat)}</span>
                    <span className="mx-2">·</span>
                    <span>Created {formatDate(agent.created_at)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
