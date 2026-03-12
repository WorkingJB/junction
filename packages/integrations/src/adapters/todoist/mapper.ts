/**
 * Todoist task mapping utilities
 */

import type { IntegratedTask, TaskStatus, TaskPriority } from '../../types/common';
import type { TodoistTask, CreateTaskRequest, UpdateTaskRequest } from './types';
import { PriorityMapping, StatusMapping, DateMapping } from '../../utils';

/**
 * Map Todoist task to Orqestr IntegratedTask
 */
export function mapTodoistTaskToIntegrated(task: TodoistTask): IntegratedTask {
  return {
    externalId: task.id,
    title: task.content,
    description: task.description || undefined,
    status: mapTodoistStatus(task.is_completed),
    priority: mapTodoistPriority(task.priority),
    dueDate: task.due?.datetime || task.due?.date
      ? DateMapping.parse(task.due.datetime || task.due.date)
      : undefined,
    createdAt: DateMapping.parse(task.created_at),
    externalUrl: task.url,
    provider: 'todoist',
    metadata: {
      projectId: task.project_id,
      sectionId: task.section_id,
      labels: task.labels,
      order: task.order,
      commentCount: task.comment_count,
      parentId: task.parent_id,
      assigneeId: task.assignee_id,
    },
  };
}

/**
 * Map Orqestr task to Todoist create request
 */
export function mapIntegratedTaskToTodoistCreate(
  task: IntegratedTask,
  projectId?: string
): CreateTaskRequest {
  const request: CreateTaskRequest = {
    content: task.title,
    description: task.description,
    priority: mapOrqestrPriorityToTodoist(task.priority),
  };

  // Set project ID from metadata or parameter
  if (task.metadata?.projectId) {
    request.project_id = task.metadata.projectId as string;
  } else if (projectId) {
    request.project_id = projectId;
  }

  // Set section ID from metadata
  if (task.metadata?.sectionId) {
    request.section_id = task.metadata.sectionId as string;
  }

  // Set labels from metadata
  if (task.metadata?.labels && Array.isArray(task.metadata.labels)) {
    request.labels = task.metadata.labels as string[];
  }

  // Set due date
  if (task.dueDate) {
    request.due_date = DateMapping.toDateString(task.dueDate);
  }

  return request;
}

/**
 * Map Orqestr task to Todoist update request
 */
export function mapIntegratedTaskToTodoistUpdate(
  task: IntegratedTask
): UpdateTaskRequest {
  const request: UpdateTaskRequest = {};

  if (task.title) {
    request.content = task.title;
  }

  if (task.description !== undefined) {
    request.description = task.description;
  }

  if (task.priority) {
    request.priority = mapOrqestrPriorityToTodoist(task.priority);
  }

  if (task.metadata?.labels && Array.isArray(task.metadata.labels)) {
    request.labels = task.metadata.labels as string[];
  }

  if (task.dueDate !== undefined) {
    request.due_date = DateMapping.toDateString(task.dueDate) || '';
  }

  return request;
}

/**
 * Map Todoist status to Orqestr status
 * Todoist only has completed/not completed
 */
function mapTodoistStatus(isCompleted: boolean): TaskStatus {
  return isCompleted ? 'completed' : 'todo';
}

/**
 * Map Todoist priority to Orqestr priority
 * Todoist: 1 = normal, 2 = medium, 3 = high, 4 = urgent
 * We reverse this to match Orqestr's convention
 */
function mapTodoistPriority(priority: number): TaskPriority {
  switch (priority) {
    case 4:
      return 'urgent';
    case 3:
      return 'high';
    case 2:
      return 'medium';
    case 1:
    default:
      return 'low';
  }
}

/**
 * Map Orqestr priority to Todoist priority
 */
function mapOrqestrPriorityToTodoist(priority?: TaskPriority): number {
  switch (priority) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}
