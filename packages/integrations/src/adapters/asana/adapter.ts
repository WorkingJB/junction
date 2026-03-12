/**
 * Asana integration adapter
 * Implements OAuth 2.0 authentication and REST API v1
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
  paginateResults,
  buildAuthUrl,
  parseTokenResponse,
  buildTokenExchangeBody,
  buildTokenRefreshBody,
  verifyHmacSignature,
  ApiError,
} from '../../utils';
import type {
  AsanaTask,
  AsanaUser,
  AsanaWebhook,
  AsanaWebhookPayload,
  AsanaWebhookAction,
  AsanaResponse,
  AsanaListResponse,
  CreateWebhookRequest,
} from './types';
import {
  mapAsanaTaskToIntegrated,
  mapIntegratedTaskToAsanaCreate,
  mapIntegratedTaskToAsanaUpdate,
} from './mapper';

export class AsanaAdapter extends BaseIntegrationAdapter {
  readonly provider = 'asana';
  readonly baseUrl = 'https://app.asana.com/api/1.0';
  readonly authUrl = 'https://app.asana.com/-/oauth_authorize';
  readonly tokenUrl = 'https://app.asana.com/-/oauth_token';
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
      // Asana doesn't use scopes in the traditional sense
      // The app's permissions are set in the developer console
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
        body: buildTokenExchangeBody({
          code: config.code,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
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
      refresh_token: response.refresh_token,
      expires_in: response.expires_in,
    });
  }

  async refreshAccessToken(config: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<OAuthTokens> {
    const response = await retryWithBackoff(async () => {
      const result = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: buildTokenRefreshBody({
          refreshToken: config.refreshToken,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
        }),
      });

      if (!result.ok) {
        const error = await result.text();
        throw new ApiError(`Token refresh failed: ${error}`, result.status);
      }

      return result.json();
    });

    return parseTokenResponse({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_in: response.expires_in,
    });
  }

  async revokeAccess(tokens: OAuthTokens): Promise<void> {
    // Asana doesn't have a token revocation endpoint in the API
    // Users must revoke access through their Asana app settings
    console.log('Token revocation must be done through Asana settings:', tokens.accessToken);
  }

  // ========== Task Sync Methods ==========

  async fetchTasks(config: IntegrationConfig): Promise<IntegratedTask[]> {
    const client = this.createClient(config);

    // Get user's workspace(s)
    const userInfo = await this.getUserInfo(config);
    const workspaces = (userInfo as { workspaces?: Array<{ gid: string }> }).workspaces;

    if (!workspaces || workspaces.length === 0) {
      return [];
    }

    // Fetch tasks from all workspaces
    const allTasks: IntegratedTask[] = [];

    for (const workspace of workspaces) {
      const tasks = await paginateResults<AsanaTask>(
        async (offset?: string) => {
          const params: Record<string, string> = {
            workspace: workspace.gid,
            assignee: 'me',
            completed_since: 'now',
            opt_fields: 'gid,name,notes,completed,completed_at,due_on,due_at,created_at,modified_at,permalink_url,projects,workspace,assignee,tags,custom_fields,num_subtasks,parent',
          };

          if (offset) {
            params.offset = offset;
          }

          const response = await client.get<AsanaListResponse<AsanaTask>>('/tasks', {
            params,
          });

          return {
            data: response.data.data,
            nextCursor: response.data.next_page?.offset,
          };
        }
      );

      allTasks.push(...tasks.map(mapAsanaTaskToIntegrated));
    }

    return allTasks;
  }

  async createTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask> {
    const client = this.createClient(config);
    const createRequest = mapIntegratedTaskToAsanaCreate(task);

    const createdTask = await retryWithBackoff(async () => {
      const response = await client.post<AsanaResponse<AsanaTask>>('/tasks', {
        data: createRequest,
      });
      return response.data.data;
    });

    return mapAsanaTaskToIntegrated(createdTask);
  }

  async updateTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask> {
    const client = this.createClient(config);
    const updateRequest = mapIntegratedTaskToAsanaUpdate(task);

    const updatedTask = await retryWithBackoff(async () => {
      const response = await client.put<AsanaResponse<AsanaTask>>(
        `/tasks/${task.externalId}`,
        { data: updateRequest }
      );
      return response.data.data;
    });

    return mapAsanaTaskToIntegrated(updatedTask);
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
      // Fetch all tasks from Asana
      const externalTasks = await this.fetchTasks(config);

      // TODO: Compare with local tasks in database and sync changes
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

  async registerWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookUrl: string;
    events: string[];
  }): Promise<{ webhookId: string; secret?: string }> {
    const client = this.createClient(config.integrationConfig);

    // Get user's workspace to create webhook for
    const userInfo = await this.getUserInfo(config.integrationConfig);
    const workspaces = (userInfo as { workspaces?: Array<{ gid: string }> }).workspaces;

    if (!workspaces || workspaces.length === 0) {
      throw new Error('No workspace found for user');
    }

    const workspaceGid = workspaces[0].gid;

    const webhookRequest: CreateWebhookRequest = {
      resource: workspaceGid,
      target: config.webhookUrl,
      filters: [
        {
          resource_type: 'task',
          action: AsanaWebhookAction.ADDED,
        },
        {
          resource_type: 'task',
          action: AsanaWebhookAction.CHANGED,
        },
        {
          resource_type: 'task',
          action: AsanaWebhookAction.DELETED,
        },
      ],
    };

    const webhook = await retryWithBackoff(async () => {
      const response = await client.post<AsanaResponse<AsanaWebhook>>('/webhooks', {
        data: webhookRequest,
      });
      return response.data.data;
    });

    return {
      webhookId: webhook.gid,
      // Asana uses a shared secret that's generated by the webhook handshake
      // The secret is sent to the webhook URL during verification
    };
  }

  async unregisterWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookId: string;
  }): Promise<void> {
    const client = this.createClient(config.integrationConfig);

    await retryWithBackoff(async () => {
      await client.delete(`/webhooks/${config.webhookId}`);
    });
  }

  validateWebhook(payload: WebhookPayload, secret: string): boolean {
    if (!payload.signature) {
      return false;
    }

    // Asana uses HMAC-SHA256 signature
    // The signature is sent in the X-Hook-Signature header
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
      const asanaPayload = payload.data as unknown as AsanaWebhookPayload;

      for (const event of asanaPayload.events) {
        // Only process task events
        if (event.resource.resource_type !== 'task') {
          continue;
        }

        switch (event.action) {
          case AsanaWebhookAction.ADDED:
            result.tasksCreated++;
            break;
          case AsanaWebhookAction.CHANGED:
            result.tasksUpdated++;
            break;
          case AsanaWebhookAction.DELETED:
            result.tasksDeleted++;
            break;
          default:
            console.log(`Unhandled webhook action: ${event.action}`);
        }

        // TODO: Actually sync the task with the database
        console.log(`Processed webhook event ${event.action} for task ${event.resource.gid}`);
      }
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
      const response = await client.get('/users/me');

      const rateLimitInfo = extractRateLimitInfo(response.headers as Record<string, string>);

      if (rateLimitInfo) {
        return rateLimitInfo;
      }
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
    }

    // Return default rate limit for Asana (150 requests per minute)
    return {
      limit: 150,
      remaining: 150,
      resetAt: new Date(Date.now() + 60 * 1000),
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
    workspaces?: Array<{ gid: string; name: string }>;
  }> {
    const client = this.createClient(config);

    const user = await retryWithBackoff(async () => {
      const response = await client.get<AsanaResponse<AsanaUser>>('/users/me', {
        params: {
          opt_fields: 'gid,email,name,photo,workspaces.gid,workspaces.name',
        },
      });
      return response.data.data;
    });

    return {
      id: user.gid,
      email: user.email,
      name: user.name,
      workspaces: user.workspaces,
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
