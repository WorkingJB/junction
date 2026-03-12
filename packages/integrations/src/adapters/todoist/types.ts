/**
 * Todoist API type definitions
 * Based on Todoist REST API v2
 */

/**
 * Todoist task object
 */
export interface TodoistTask {
  id: string;
  project_id: string;
  section_id?: string;
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  parent_id?: string;
  order: number;
  priority: number; // 1-4, where 1 is normal and 4 is urgent
  due?: {
    date: string;
    string: string;
    datetime?: string;
    timezone?: string;
  };
  url: string;
  comment_count: number;
  created_at: string;
  creator_id: string;
  assignee_id?: string;
  assigner_id?: string;
}

/**
 * Todoist project object
 */
export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id?: string;
}

/**
 * Todoist webhook event types
 */
export enum TodoistWebhookEvent {
  ITEM_ADDED = 'item:added',
  ITEM_UPDATED = 'item:updated',
  ITEM_DELETED = 'item:deleted',
  ITEM_COMPLETED = 'item:completed',
  ITEM_UNCOMPLETED = 'item:uncompleted',
}

/**
 * Todoist webhook payload
 */
export interface TodoistWebhookPayload {
  event_name: TodoistWebhookEvent;
  user_id: string;
  event_data: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * Todoist user info
 */
export interface TodoistUser {
  id: string;
  email: string;
  full_name: string;
  avatar_medium?: string;
  timezone?: string;
}

/**
 * Request/Response types
 */

export interface CreateTaskRequest {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  parent_id?: string;
  order?: number;
  labels?: string[];
  priority?: number;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  assignee_id?: string;
}

export interface UpdateTaskRequest {
  content?: string;
  description?: string;
  labels?: string[];
  priority?: number;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
}

export interface TodoistOAuthResponse {
  access_token: string;
  token_type: string;
}
