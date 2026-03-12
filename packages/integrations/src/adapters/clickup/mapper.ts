/**
 * ClickUp task mapping utilities
 */

import type { IntegratedTask, TaskStatus, TaskPriority } from '../../types/common';
import type { ClickUpTask, CreateTaskRequest, UpdateTaskRequest } from './types';
import { StatusMapping, DateMapping } from '../../utils';

/**
 * Map ClickUp task to Orqestr IntegratedTask
 */
export function mapClickUpTaskToIntegrated(task: ClickUpTask): IntegratedTask {
  return {
    externalId: task.id,
    title: task.name,
    description: task.description || undefined,
    status: mapClickUpStatus(task.status.status, task.status.type),
    priority: mapClickUpPriority(task.priority?.priority),
    dueDate: task.due_date ? new Date(parseInt(task.due_date, 10)) : undefined,
    createdAt: new Date(parseInt(task.date_created, 10)),
    updatedAt: new Date(parseInt(task.date_updated, 10)),
    externalUrl: task.url,
    provider: 'clickup',
    metadata: {
      listId: task.list.id,
      listName: task.list.name,
      folderId: task.folder.id,
      folderName: task.folder.name,
      spaceId: task.space.id,
      statusId: task.status.id,
      priorityId: task.priority?.id,
      assignees: task.assignees,
      tags: task.tags,
      customFields: task.custom_fields,
      parentId: task.parent,
      archived: task.archived,
      startDate: task.start_date,
      dateClosed: task.date_closed,
    },
  };
}

/**
 * Map Orqestr task to ClickUp create request
 */
export function mapIntegratedTaskToClickUpCreate(
  task: IntegratedTask
): CreateTaskRequest {
  const request: CreateTaskRequest = {
    name: task.title,
    description: task.description,
  };

  // Set priority
  if (task.priority) {
    request.priority = mapOrqestrPriorityToClickUp(task.priority);
  }

  // Set due date
  if (task.dueDate) {
    request.due_date = task.dueDate.getTime();
    request.due_date_time = true;
  }

  // Set assignees from metadata
  if (task.metadata?.assignees && Array.isArray(task.metadata.assignees)) {
    request.assignees = (task.metadata.assignees as Array<{ id: number }>).map(a => a.id);
  }

  // Set tags from metadata
  if (task.metadata?.tags && Array.isArray(task.metadata.tags)) {
    request.tags = (task.metadata.tags as Array<{ name: string }>).map(t => t.name);
  }

  // Set status from metadata
  if (task.metadata?.statusId) {
    request.status = task.metadata.statusId as string;
  }

  // Set parent from metadata
  if (task.metadata?.parentId) {
    request.parent = task.metadata.parentId as string;
  }

  return request;
}

/**
 * Map Orqestr task to ClickUp update request
 */
export function mapIntegratedTaskToClickUpUpdate(
  task: IntegratedTask
): UpdateTaskRequest {
  const request: UpdateTaskRequest = {};

  if (task.title) {
    request.name = task.title;
  }

  if (task.description !== undefined) {
    request.description = task.description;
  }

  if (task.priority) {
    request.priority = mapOrqestrPriorityToClickUp(task.priority);
  }

  if (task.dueDate !== undefined) {
    request.due_date = task.dueDate.getTime();
    request.due_date_time = true;
  }

  // Status updates are handled separately via the status endpoint
  if (task.metadata?.statusId) {
    request.status = task.metadata.statusId as string;
  }

  return request;
}

/**
 * Map ClickUp status to Orqestr status
 * ClickUp statuses are customizable per workspace
 */
function mapClickUpStatus(statusName: string, statusType: string): TaskStatus {
  const normalized = statusName.toLowerCase().trim();

  // Check status type first (closed, custom, open)
  if (statusType === 'closed') {
    return 'completed';
  }

  // Then check common status names
  if (['to do', 'todo', 'open', 'backlog'].includes(normalized)) {
    return 'todo';
  }
  if (['in progress', 'in-progress', 'active', 'working'].includes(normalized)) {
    return 'in_progress';
  }
  if (['complete', 'completed', 'done', 'closed'].includes(normalized)) {
    return 'completed';
  }
  if (['cancelled', 'canceled'].includes(normalized)) {
    return 'cancelled';
  }

  // Default based on type
  return statusType === 'open' ? 'todo' : 'in_progress';
}

/**
 * Map ClickUp priority to Orqestr priority
 * ClickUp: 1 = urgent, 2 = high, 3 = normal, 4 = low
 */
function mapClickUpPriority(priority?: string): TaskPriority | undefined {
  if (!priority) {
    return undefined;
  }

  const normalized = priority.toLowerCase().trim();

  switch (normalized) {
    case 'urgent':
      return 'urgent';
    case 'high':
      return 'high';
    case 'normal':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Map Orqestr priority to ClickUp priority
 */
function mapOrqestrPriorityToClickUp(priority?: TaskPriority): number | undefined {
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
      return undefined;
  }
}
