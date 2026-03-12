/**
 * Todoist integration adapter
 * Implements OAuth 2.0 authentication and REST API v2
 */

import type { AxiosInstance } from 'axios';
import { BaseIntegrationAdapter } from '../base';
import type {
  IntegratedTask,
  IntegrationConfig,
  OAuthTokens,
  SyncResult,
  WebhookPayload,
  RateLimitInfo,
} from '../../types/common';
import {
  createHttpClient,
  extractRateLimitInfo,
  retryWithBackoff,
  buildAuthUrl,
  parseTokenResponse,
  verifyHmacSignature,
  ApiError,
} from '../../utils';
import type {
  TodoistTask,
  TodoistUser,
  TodoistWebhookPayload,
  TodoistWebhookEvent,
} from './types';
import {
  mapTodoistTaskToIntegrated,
  mapIntegratedTaskToTodoistCreate,
  mapIntegratedTaskToTodoistUpdate,
} from './mapper';

export class TodoistAdapter extends BaseIntegrationAdapter {
  readonly provider = 'todoist';
  readonly baseUrl = 'https://api.todoist.com/rest/v2';
  readonly authUrl = 'https://todoist.com/oauth/authorize';
  readonly tokenUrl = 'https://todoist.com/oauth/access_token';
  readonly supportsWebhooks = true;
  readonly requiresPolling = false;

  // ========== OAuth Methods ==========

  getAuthorizationUrl(config: {
    clientId: string;
    redirectUri: string;
    state: string;
    scopes?: string[];
  }): string {
    return buildAuthUrl({
      baseUrl: this.authUrl,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state: config.state,
      scopes: config.scopes || ['data:read_write'],
    });
  }

  async exchangeCodeForTokens(config: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<OAuthTokens> {
    const response = await retryWithBackoff(async () => {
      const result = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: config.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
        }),
      });

      if (!result.ok) {
        const error = await result.text();
        throw new ApiError(`Token exchange failed: ${error}`, result.status);
      }

      return result.json();
    });

    return parseTokenResponse({
      access_token: response.access_token,
    });
  }

  async refreshAccessToken(_config: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<OAuthTokens> {
    // Todoist tokens don't expire, so refresh is not needed
    throw new Error('Todoist tokens do not expire and cannot be refreshed');
  }

  async revokeAccess(tokens: OAuthTokens): Promise<void> {
    // Todoist doesn't have a token revocation endpoint
    // Users must revoke access through their Todoist settings
    console.log('Token revocation must be done through Todoist settings:', tokens.accessToken);
  }

  // ========== Task Sync Methods ==========

  async fetchTasks(config: IntegrationConfig): Promise<IntegratedTask[]> {
    const client = this.createClient(config);

    const tasks = await retryWithBackoff(async () => {
      const response = await client.get<TodoistTask[]>('/tasks');
      return response.data;
    });

    return tasks.map(mapTodoistTaskToIntegrated);
  }

  async createTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask> {
    const client = this.createClient(config);
    const createRequest = mapIntegratedTaskToTodoistCreate(task);

    const createdTask = await retryWithBackoff(async () => {
      const response = await client.post<TodoistTask>('/tasks', createRequest);
      return response.data;
    });

    return mapTodoistTaskToIntegrated(createdTask);
  }

  async updateTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask> {
    const client = this.createClient(config);
    const updateRequest = mapIntegratedTaskToTodoistUpdate(task);

    const updatedTask = await retryWithBackoff(async () => {
      const response = await client.post<TodoistTask>(
        `/tasks/${task.externalId}`,
        updateRequest
      );
      return response.data;
    });

    // Handle status changes (complete/uncomplete)
    if (task.status === 'done') {
      await client.post(`/tasks/${task.externalId}/close`);
      updatedTask.is_completed = true;
    } else if (task.status === 'todo') {
      await client.post(`/tasks/${task.externalId}/reopen`);
      updatedTask.is_completed = false;
    }

    return mapTodoistTaskToIntegrated(updatedTask);
  }

  async deleteTask(externalId: string, config: IntegrationConfig): Promise<void> {
    const client = this.createClient(config);

    await retryWithBackoff(async () => {
      await client.delete(`/tasks/${externalId}`);
    });
  }

  async syncTasks(config: IntegrationConfig): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      tasksCreated: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      errors: [],
    };

    try {
      // Fetch all tasks from Todoist
      const externalTasks = await this.fetchTasks(config);

      // TODO: Compare with local tasks in database and sync changes
      // This would require access to the database service
      // For now, we just return the count of fetched tasks
      result.tasksCreated = externalTasks.length;
    } catch (error) {
      result.success = false;
      result.errors.push({
        message: error instanceof Error ? error.message : 'Unknown error during sync',
        timestamp: new Date(),
      });
    }

    return result;
  }

  // ========== Webhook Methods ==========

  async registerWebhook(_config: {
    integrationConfig: IntegrationConfig;
    webhookUrl: string;
    events: string[];
  }): Promise<{ webhookId: string; secret?: string }> {
    // Todoist webhooks are managed through the developer console
    // not via API, so we return a placeholder
    throw new Error(
      'Todoist webhooks must be registered through the developer console at https://developer.todoist.com/appconsole.html'
    );
  }

  async unregisterWebhook(_config: {
    integrationConfig: IntegrationConfig;
    webhookId: string;
  }): Promise<void> {
    // Todoist webhooks are managed through the developer console
    throw new Error(
      'Todoist webhooks must be unregistered through the developer console'
    );
  }

  validateWebhook(payload: WebhookPayload, secret: string): boolean {
    if (!payload.signature) {
      return false;
    }

    // Todoist uses HMAC-SHA256 signature
    // The signature is sent in the X-Todoist-Hmac-SHA256 header
    return verifyHmacSignature({
      payload: JSON.stringify(payload.data),
      signature: payload.signature,
      secret,
      algorithm: 'sha256',
    });
  }

  async processWebhook(
    payload: WebhookPayload,
    config: IntegrationConfig
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      tasksCreated: 0,
      tasksUpdated: 0,
      tasksDeleted: 0,
      errors: [],
    };

    try {
      const todoistPayload = payload.data as unknown as TodoistWebhookPayload;
      const eventType = todoistPayload.event_name;
      const taskId = todoistPayload.event_data.id;

      switch (eventType) {
        case 'item:added':
          result.tasksCreated = 1;
          break;
        case 'item:updated':
        case 'item:completed':
        case 'item:uncompleted':
          result.tasksUpdated = 1;
          break;
        case 'item:deleted':
          result.tasksDeleted = 1;
          break;
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
      }

      // TODO: Actually sync the task with the database
      console.log(`Processed webhook event ${eventType} for task ${taskId}`);
    } catch (error) {
      result.success = false;
      result.errors.push({
        message: error instanceof Error ? error.message : 'Unknown error processing webhook',
        timestamp: new Date(),
      });
    }

    return result;
  }

  // ========== Rate Limiting ==========

  async getRateLimitInfo(config: IntegrationConfig): Promise<RateLimitInfo> {
    const client = this.createClient(config);

    try {
      // Make a lightweight request to get rate limit headers
      const response = await client.get('/tasks', {
        params: { limit: 1 },
      });

      const rateLimitInfo = extractRateLimitInfo(response.headers as Record<string, string>);

      if (rateLimitInfo) {
        return rateLimitInfo;
      }
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
    }

    // Return default rate limit for Todoist (450 requests per 15 minutes)
    return {
      limit: 450,
      remaining: 450,
      resetAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  // ========== Utility Methods ==========

  async testConnection(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.getUserInfo(config);
      return true;
    } catch {
      return false;
    }
  }

  async getUserInfo(config: IntegrationConfig): Promise<{
    id: string;
    email?: string;
    name?: string;
  }> {
    const client = this.createClient(config);

    const user = await retryWithBackoff(async () => {
      // Todoist doesn't have a dedicated user endpoint in REST API v2
      // We can use the sync API or infer from tasks
      // For now, we'll make a request to verify the token works
      const response = await client.get<TodoistTask[]>('/tasks', {
        params: { limit: 1 },
      });

      // Return a placeholder - in production you'd use the Sync API
      // or store user info during OAuth
      return {
        id: response.data[0]?.creator_id || 'unknown',
      };
    });

    return {
      id: user.id,
    };
  }

  // ========== Helper Methods ==========

  private createClient(config: IntegrationConfig): AxiosInstance {
    return createHttpClient({
      baseUrl: this.baseUrl,
      tokens: config.tokens,
    });
  }
}
