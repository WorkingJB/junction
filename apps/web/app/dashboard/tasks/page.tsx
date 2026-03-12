'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@orqestr/database';
import TaskList from '@/components/tasks/task-list';
import TaskForm from '@/components/tasks/task-form';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Task['type'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (typeFilter !== 'all') params.append('type', typeFilter);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/tasks?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data = await response.json();
        setTasks(data.tasks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [statusFilter, typeFilter, searchQuery]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Failed to create task');

      setShowCreateForm(false);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTask = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');

      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      await fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Manage your personal and work tasks
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showCreateForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 font-semibold">Create New Task</h3>
          <TaskForm onSubmit={handleCreateTask} onCancel={() => setShowCreateForm(false)} />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">All Tasks</p>
          <p className="mt-1 text-2xl font-bold">{taskCounts.all}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">To Do</p>
          <p className="mt-1 text-2xl font-bold">{taskCounts.todo}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="mt-1 text-2xl font-bold">{taskCounts.in_progress}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold">{taskCounts.completed}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No tasks found. Create your first task to get started!
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
    </div>
  );
}
