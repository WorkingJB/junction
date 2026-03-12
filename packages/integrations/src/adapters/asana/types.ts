/**
 * Asana API type definitions
 * Based on Asana REST API v1
 */

/**
 * Asana task object
 */
export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  due_at?: string;
  created_at: string;
  modified_at: string;
  permalink_url: string;
  projects?: Array<{ gid: string; name: string }>;
  workspace: { gid: string; name: string };
  assignee?: {
    gid: string;
    name: string;
  };
  tags?: Array<{ gid: string; name: string }>;
  custom_fields?: Array<{
    gid: string;
    name: string;
    type: string;
    enum_value?: { gid: string; name: string };
  }>;
  num_subtasks?: number;
  parent?: { gid: string; name: string };
}

/**
 * Asana project object
 */
export interface AsanaProject {
  gid: string;
  name: string;
  notes?: string;
  archived: boolean;
  color?: string;
  created_at: string;
  modified_at: string;
  permalink_url: string;
  workspace: { gid: string; name: string };
}

/**
 * Asana webhook object
 */
export interface AsanaWebhook {
  gid: string;
  resource: {
    gid: string;
    name?: string;
  };
  target: string;
  active: boolean;
  created_at: string;
}

/**
 * Asana webhook event types
 */
export enum AsanaWebhookAction {
  ADDED = 'added',
  CHANGED = 'changed',
  DELETED = 'deleted',
  REMOVED = 'removed',
  UNDELETED = 'undeleted',
}

/**
 * Asana webhook payload
 */
export interface AsanaWebhookPayload {
  events: Array<{
    action: AsanaWebhookAction;
    created_at: string;
    parent?: { gid: string; resource_type: string };
    resource: {
      gid: string;
      resource_type: string;
      name?: string;
    };
    user?: {
      gid: string;
      name: string;
    };
  }>;
}

/**
 * Asana user object
 */
export interface AsanaUser {
  gid: string;
  email?: string;
  name: string;
  photo?: {
    image_128x128?: string;
  };
  workspaces?: Array<{
    gid: string;
    name: string;
  }>;
}

/**
 * Request/Response types
 */

export interface AsanaResponse<T> {
  data: T;
}

export interface AsanaListResponse<T> {
  data: T[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  };
}

export interface CreateTaskRequest {
  name: string;
  notes?: string;
  projects?: string[];
  workspace?: string;
  due_on?: string;
  due_at?: string;
  assignee?: string;
  tags?: string[];
}

export interface UpdateTaskRequest {
  name?: string;
  notes?: string;
  completed?: boolean;
  due_on?: string;
  due_at?: string;
  assignee?: string;
}

export interface CreateWebhookRequest {
  resource: string;
  target: string;
  filters?: Array<{
    resource_type: string;
    resource_subtype?: string;
    action: AsanaWebhookAction;
  }>;
}

export interface AsanaOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token: string;
  data: {
    id: string;
    gid: string;
    name: string;
    email: string;
  };
}
