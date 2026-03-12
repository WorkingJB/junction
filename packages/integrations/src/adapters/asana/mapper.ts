/**
 * Asana task mapping utilities
 */

import type { IntegratedTask, TaskStatus } from '../../types/common';
import type { AsanaTask, CreateTaskRequest, UpdateTaskRequest } from './types';
import { StatusMapping, DateMapping } from '../../utils';

/**
 * Map Asana task to Orqestr IntegratedTask
 */
export function mapAsanaTaskToIntegrated(task: AsanaTask): IntegratedTask {
  return {
    externalId: task.gid,
    title: task.name,
    description: task.notes || undefined,
    status: mapAsanaStatus(task.completed),
    // Asana doesn't have a built-in priority field
    // Could be derived from custom fields or tags
    priority: undefined,
    dueDate: task.due_at || task.due_on
      ? DateMapping.parse(task.due_at || task.due_on)
      : undefined,
    createdAt: DateMapping.parse(task.created_at),
    updatedAt: DateMapping.parse(task.modified_at),
    externalUrl: task.permalink_url,
    provider: 'asana',
    metadata: {
      workspaceGid: task.workspace.gid,
      projects: task.projects?.map(p => ({ gid: p.gid, name: p.name })),
      assignee: task.assignee,
      tags: task.tags,
      customFields: task.custom_fields,
      numSubtasks: task.num_subtasks,
      parentGid: task.parent?.gid,
      completedAt: task.completed_at,
    },
  };
}

/**
 * Map Orqestr task to Asana create request
 */
export function mapIntegratedTaskToAsanaCreate(
  task: IntegratedTask,
  workspaceGid?: string
): CreateTaskRequest {
  const request: CreateTaskRequest = {
    name: task.title,
    notes: task.description,
  };

  // Set workspace from metadata or parameter
  if (task.metadata?.workspaceGid) {
    request.workspace = task.metadata.workspaceGid as string;
  } else if (workspaceGid) {
    request.workspace = workspaceGid;
  }

  // Set projects from metadata
  if (task.metadata?.projects && Array.isArray(task.metadata.projects)) {
    request.projects = (task.metadata.projects as Array<{ gid: string }>).map(p => p.gid);
  }

  // Set assignee from metadata
  if (task.metadata?.assignee && typeof task.metadata.assignee === 'object') {
    const assignee = task.metadata.assignee as { gid: string };
    request.assignee = assignee.gid;
  }

  // Set tags from metadata
  if (task.metadata?.tags && Array.isArray(task.metadata.tags)) {
    request.tags = (task.metadata.tags as Array<{ gid: string }>).map(t => t.gid);
  }

  // Set due date
  if (task.dueDate) {
    // If time is specified, use due_at, otherwise use due_on
    const dateString = DateMapping.toISO(task.dueDate);
    if (dateString && dateString.includes('T')) {
      request.due_at = dateString;
    } else {
      request.due_on = DateMapping.toDateString(task.dueDate);
    }
  }

  return request;
}

/**
 * Map Orqestr task to Asana update request
 */
export function mapIntegratedTaskToAsanaUpdate(
  task: IntegratedTask
): UpdateTaskRequest {
  const request: UpdateTaskRequest = {};

  if (task.title) {
    request.name = task.title;
  }

  if (task.description !== undefined) {
    request.notes = task.description;
  }

  if (task.status) {
    request.completed = task.status === 'done';
  }

  if (task.metadata?.assignee && typeof task.metadata.assignee === 'object') {
    const assignee = task.metadata.assignee as { gid: string };
    request.assignee = assignee.gid;
  }

  if (task.dueDate !== undefined) {
    const dateString = DateMapping.toISO(task.dueDate);
    if (dateString && dateString.includes('T')) {
      request.due_at = dateString;
    } else {
      request.due_on = DateMapping.toDateString(task.dueDate) || '';
    }
  }

  return request;
}

/**
 * Map Asana status to Orqestr status
 * Asana only has completed/not completed
 */
function mapAsanaStatus(completed: boolean): TaskStatus {
  return completed ? 'done' : 'todo';
}
