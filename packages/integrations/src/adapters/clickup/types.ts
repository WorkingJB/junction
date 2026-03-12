/**
 * ClickUp API type definitions
 * Based on ClickUp API v2
 */

/**
 * ClickUp task object
 */
export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: {
    id: string;
    status: string;
    color: string;
    orderindex: number;
    type: string;
  };
  priority?: {
    id: string;
    priority: string;
    color: string;
    orderindex: number;
  };
  due_date?: string;
  start_date?: string;
  date_created: string;
  date_updated: string;
  date_closed?: string;
  url: string;
  list: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
  };
  assignees: Array<{
    id: number;
    username: string;
    email: string;
    color: string;
  }>;
  tags: Array<{
    name: string;
    tag_fg: string;
    tag_bg: string;
  }>;
  custom_fields?: Array<{
    id: string;
    name: string;
    type: string;
    value?: unknown;
  }>;
  parent?: string;
  archived: boolean;
}

/**
 * ClickUp list object
 */
export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  content?: string;
  status?: {
    status: string;
    color: string;
  };
  priority?: {
    priority: string;
    color: string;
  };
  assignee?: {
    id: number;
    username: string;
    email: string;
  };
  task_count: number;
  due_date?: string;
  start_date?: string;
  archived: boolean;
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
    name: string;
    access: boolean;
  };
}

/**
 * ClickUp webhook object
 */
export interface ClickUpWebhook {
  id: string;
  webhook: {
    id: string;
    user_id: number;
    team_id: number;
    endpoint: string;
    client_id: string;
    events: string[];
    task_id?: string;
    list_id?: string;
    folder_id?: string;
    space_id?: string;
    health: {
      status: string;
      fail_count: number;
    };
    secret: string;
  };
}

/**
 * ClickUp webhook event types
 */
export enum ClickUpWebhookEvent {
  TASK_CREATED = 'taskCreated',
  TASK_UPDATED = 'taskUpdated',
  TASK_DELETED = 'taskDeleted',
  TASK_PRIORITY_UPDATED = 'taskPriorityUpdated',
  TASK_STATUS_UPDATED = 'taskStatusUpdated',
  TASK_ASSIGNEE_UPDATED = 'taskAssigneeUpdated',
  TASK_DUE_DATE_UPDATED = 'taskDueDateUpdated',
  TASK_TAG_UPDATED = 'taskTagUpdated',
  TASK_MOVED = 'taskMoved',
  TASK_COMMENT_POSTED = 'taskCommentPosted',
}

/**
 * ClickUp webhook payload
 */
export interface ClickUpWebhookPayload {
  event: ClickUpWebhookEvent;
  task_id: string;
  webhook_id: string;
  history_items: Array<{
    id: string;
    type: number;
    date: string;
    field: string;
    parent_id?: string;
    data?: Record<string, unknown>;
    before?: unknown;
    after?: unknown;
  }>;
}

/**
 * ClickUp user object
 */
export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture?: string;
  initials: string;
  week_start_day?: number;
  global_font_support?: boolean;
  timezone?: string;
}

/**
 * ClickUp workspace (team) object
 */
export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  members: Array<{
    user: ClickUpUser;
  }>;
}

/**
 * Request/Response types
 */

export interface CreateTaskRequest {
  name: string;
  description?: string;
  markdown_description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  start_date?: number;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string;
  custom_fields?: Array<{
    id: string;
    value: unknown;
  }>;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  markdown_description?: string;
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  parent?: string;
  assignees?: {
    add?: number[];
    rem?: number[];
  };
}

export interface CreateWebhookRequest {
  endpoint: string;
  events: ClickUpWebhookEvent[];
}

export interface ClickUpOAuthResponse {
  access_token: string;
  token_type: string;
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
  last_page?: boolean;
}
