'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Database } from '@junction/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type Agent = Database['public']['Tables']['agents']['Row'];
type AgentTask = Database['public']['Tables']['agent_tasks']['Row'];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, agentsRes, agentTasksRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/agents'),
          fetch('/api/agent-tasks'),
        ]);

        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.tasks || []);
        }
        if (agentsRes.ok) {
          const data = await agentsRes.json();
          setAgents(data.agents || []);
        }
        if (agentTasksRes.ok) {
          const data = await agentTasksRes.json();
          setAgentTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const taskCounts = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const agentCounts = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    idle: agents.filter((a) => a.status === 'idle').length,
  };

  const agentTaskCounts = {
    total: agentTasks.length,
    in_progress: agentTasks.filter((t) => t.status === 'in_progress').length,
    waiting: agentTasks.filter((t) => t.status === 'waiting_for_input').length,
  };

  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to Orqestr - Your unified task and agent management platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/tasks"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent/50"
        >
          <h3 className="font-semibold">Human Tasks</h3>
          <p className="mt-2 text-2xl font-bold">
            {loading ? '...' : taskCounts.total}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {taskCounts.todo} to do, {taskCounts.in_progress} in progress
          </p>
        </Link>

        <Link
          href="/dashboard/agents"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent/50"
        >
          <h3 className="font-semibold">Agent Tasks</h3>
          <p className="mt-2 text-2xl font-bold">
            {loading ? '...' : agentTaskCounts.total}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {agentTaskCounts.in_progress} in progress, {agentTaskCounts.waiting} waiting
          </p>
        </Link>

        <Link
          href="/dashboard/agents"
          className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent/50"
        >
          <h3 className="font-semibold">Active Agents</h3>
          <p className="mt-2 text-2xl font-bold">
            {loading ? '...' : agentCounts.active}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {agentCounts.total} total, {agentCounts.idle} idle
          </p>
        </Link>
      </div>

      {!loading && recentTasks.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Tasks</h3>
            <Link
              href="/dashboard/tasks"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.status.replace('_', ' ')} · {task.priority}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {task.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Getting Started</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ Phase 1: Foundation - Complete!</li>
          <li>✓ Phase 2: Task Management - Complete!</li>
          <li>✓ Phase 3: Agent Integration - In Progress!</li>
          <li>→ Next: Build MCP server for Claude Code integration</li>
        </ul>
      </div>
    </div>
  );
}
