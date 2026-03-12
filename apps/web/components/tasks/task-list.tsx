'use client';

import { useState } from 'react';
import type { Database } from '@orqestr/database';
import TaskForm from './task-form';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskListProps {
  tasks: Task[];
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function TaskList({ tasks, onUpdate, onDelete }: TaskListProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const handleQuickStatusChange = async (task: Task) => {
    const nextStatus: Record<Task['status'], Task['status']> = {
      todo: 'in_progress',
      in_progress: 'completed',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    await onUpdate(task.id, { status: nextStatus[task.status] });
  };

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTaskId) return;
    await onUpdate(editingTaskId, taskData);
    setEditingTaskId(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
        >
          {editingTaskId === task.id ? (
            <TaskForm
              task={task}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTaskId(null)}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[task.status]
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {task.type}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(task.created_at)}</span>
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        Due {formatDate(task.due_date)}
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-green-600 dark:text-green-400">
                        Completed {formatDate(task.completed_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <button
                      onClick={() => handleQuickStatusChange(task)}
                      className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      {task.status === 'todo' ? 'Start' : 'Complete'}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTaskId(task.id)}
                    className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
