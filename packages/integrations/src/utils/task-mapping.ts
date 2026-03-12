/**
 * Task mapping utilities for converting between provider formats and Orqestr format
 */

import type { IntegratedTask, TaskStatus, TaskPriority } from '../types/common';

/**
 * Priority mapping helpers
 */
export const PriorityMapping = {
  /**
   * Map from Orqestr priority to numeric value (1-4)
   */
  toNumeric(priority?: TaskPriority): number {
    switch (priority) {
      case 'urgent':
        return 1;
      case 'high':
        return 2;
      case 'medium':
        return 3;
      case 'low':
        return 4;
      default:
        return 3; // Default to medium
    }
  },

  /**
   * Map from numeric priority (1-4) to Orqestr priority
   */
  fromNumeric(priority: number): TaskPriority {
    if (priority === 1) return 'urgent';
    if (priority === 2) return 'high';
    if (priority === 4) return 'low';
    return 'medium';
  },

  /**
   * Map from string priority to Orqestr priority
   */
  fromString(priority: string): TaskPriority {
    const normalized = priority.toLowerCase().trim();

    if (['urgent', 'critical', 'highest', 'p1'].includes(normalized)) {
      return 'urgent';
    }
    if (['high', 'important', 'p2'].includes(normalized)) {
      return 'high';
    }
    if (['low', 'minor', 'p4'].includes(normalized)) {
      return 'low';
    }
    return 'medium';
  },
};

/**
 * Status mapping helpers
 */
export const StatusMapping = {
  /**
   * Map common status strings to Orqestr status
   */
  fromString(status: string): TaskStatus {
    const normalized = status.toLowerCase().trim();

    if (['todo', 'pending', 'open', 'new', 'backlog'].includes(normalized)) {
      return 'todo';
    }
    if (['in_progress', 'in progress', 'started', 'active', 'working'].includes(normalized)) {
      return 'in_progress';
    }
    if (['done', 'completed', 'finished', 'closed', 'resolved'].includes(normalized)) {
      return 'done';
    }
    if (['cancelled', 'canceled', 'archived'].includes(normalized)) {
      return 'cancelled';
    }

    return 'todo'; // Default to todo
  },

  /**
   * Map Orqestr status to common status string
   */
  toString(status: TaskStatus, format: 'snake_case' | 'camelCase' | 'Title Case' = 'snake_case'): string {
    if (format === 'camelCase') {
      const map: Record<TaskStatus, string> = {
        todo: 'todo',
        in_progress: 'inProgress',
        done: 'done',
        cancelled: 'cancelled',
      };
      return map[status];
    }

    if (format === 'Title Case') {
      const map: Record<TaskStatus, string> = {
        todo: 'To Do',
        in_progress: 'In Progress',
        done: 'Done',
        cancelled: 'Cancelled',
      };
      return map[status];
    }

    return status;
  },
};

/**
 * Date parsing helpers
 */
export const DateMapping = {
  /**
   * Parse various date formats to Date object
   */
  parse(dateString?: string | null): Date | undefined {
    if (!dateString) {
      return undefined;
    }

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  },

  /**
   * Format Date to ISO string for API requests
   */
  toISO(date?: Date | null): string | undefined {
    if (!date) {
      return undefined;
    }

    try {
      return date.toISOString();
    } catch {
      return undefined;
    }
  },

  /**
   * Format Date to date-only string (YYYY-MM-DD)
   */
  toDateString(date?: Date | null): string | undefined {
    if (!date) {
      return undefined;
    }

    try {
      return date.toISOString().split('T')[0];
    } catch {
      return undefined;
    }
  },
};

/**
 * Validate task data before syncing
 */
export function validateTask(task: Partial<IntegratedTask>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (task.title && task.title.length > 500) {
    errors.push('Title is too long (max 500 characters)');
  }

  if (!task.externalId || task.externalId.trim().length === 0) {
    errors.push('External ID is required');
  }

  if (!task.provider) {
    errors.push('Provider is required');
  }

  if (!task.status) {
    errors.push('Status is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge task updates while preserving required fields
 */
export function mergeTaskUpdates(
  existing: IntegratedTask,
  updates: Partial<IntegratedTask>
): IntegratedTask {
  return {
    ...existing,
    ...updates,
    // Preserve required fields
    id: existing.id,
    externalId: existing.externalId,
    provider: existing.provider,
    // Update timestamp
    updatedAt: new Date(),
  };
}

/**
 * Compare tasks to detect changes
 */
export function detectTaskChanges(
  local: IntegratedTask,
  external: IntegratedTask
): {
  hasChanges: boolean;
  changedFields: string[];
} {
  const changedFields: string[] = [];

  // Compare key fields
  if (local.title !== external.title) {
    changedFields.push('title');
  }
  if (local.description !== external.description) {
    changedFields.push('description');
  }
  if (local.status !== external.status) {
    changedFields.push('status');
  }
  if (local.priority !== external.priority) {
    changedFields.push('priority');
  }

  // Compare dates (normalize to ISO strings for comparison)
  const localDueDate = local.dueDate?.toISOString();
  const externalDueDate = external.dueDate?.toISOString();
  if (localDueDate !== externalDueDate) {
    changedFields.push('dueDate');
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
  };
}

/**
 * Sanitize task data before sending to external provider
 */
export function sanitizeTaskForExport(task: IntegratedTask): Partial<IntegratedTask> {
  // Remove Orqestr-specific fields
  const { id, createdAt, updatedAt, provider, metadata, ...exportData } = task;

  return exportData;
}
