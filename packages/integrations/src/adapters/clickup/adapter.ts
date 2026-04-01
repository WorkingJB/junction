/**
 * ClickUp integration adapter
 * Implements OAuth 2.0 authentication and API v2
 */

import type { HttpClient } from '../../utils/http';
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
  ClickUpTask,
  ClickUpUser,
  ClickUpTeam,
  ClickUpWebhook,
  ClickUpWebhookPayload,
  ClickUpTasksResponse,
  CreateWebhookRequest,
} from './types';
import { ClickUpWebhookEvent } from './types';
import {
  mapClickUpTaskToIntegrated,
  mapIntegratedTaskToClickUpCreate,
  mapIntegratedTaskToClickUpUpdate,
} from './mapper';

export class ClickUpAdapter extends BaseIntegrationAdapter {
  readonly provider = 'clickup';
  readonly baseUrl = 'https://api.clickup.com/api/v2';
  readonly authUrl = 'https://app.clickup.com/api';
  readonly tokenUrl = 'https://api.clickup.com/api/v2/oauth/token';
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
      baseUrl: `${this.authUrl}`,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state: config.state,
      // ClickUp doesn't use traditional scopes
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: config.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
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
    // ClickUp tokens don't expire, so refresh is not needed
    throw new Error('ClickUp tokens do not expire and cannot be refreshed');
  }

  async revokeAccess(tokens: OAuthTokens): Promise<void> {
    // ClickUp doesn't have a token revocation endpoint
    // Users must revoke access through their ClickUp settings
    console.log('Token revocation must be done through ClickUp settings:', tokens.accessToken);
  }

  // ========== Task Sync Methods ==========

  async fetchTasks(config: IntegrationConfig): Promise<IntegratedTask[]> {
    const client = this.createClient(config);

    // Get user's teams
    const teams = await this.getAuthorizedTeams(config);

    if (teams.length === 0) {
      return [];
    }

    // Fetch tasks from all teams
    const allTasks: IntegratedTask[] = [];

    for (const team of teams) {
      // Get all spaces in the team
      const spacesResponse = await client.get<{ spaces: Array<{ id: string }> }>(
        `/team/${team.id}/space`,
        {
          params: { archived: false },
        }
      );

      for (const space of spacesResponse.data.spaces) {
        // Get tasks in each space
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await retryWithBackoff(async () => {
            const result = await client.get<ClickUpTasksResponse>(
              `/space/${space.id}/task`,
              {
                params: {
                  archived: false,
                  page,
                  include_closed: true,
                },
              }
            );
            return result.data;
          });

          allTasks.push(...response.tasks.map(mapClickUpTaskToIntegrated));

          hasMore = !response.last_page;
          page++;
        }
      }
    }

    return allTasks;
  }

  async createTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask> {
    const client = this.createClient(config);
    const createRequest = mapIntegratedTaskToClickUpCreate(task);

    // ClickUp requires a list ID to create a task
    const listId = task.metadata?.listId as string | undefined;
    if (!listId) {
      throw new Error('List ID is required to create a ClickUp task');
    }

    const createdTask = await retryWithBackoff(async () => {
      const response = await client.post<ClickUpTask>(
        `/list/${listId}/task`,
        createRequest
      );
      return response.data;
    });

    return mapClickUpTaskToIntegrated(createdTask);
  }

  async updateTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask> {
    const client = this.createClient(config);
    const updateRequest = mapIntegratedTaskToClickUpUpdate(task);

    const updatedTask = await retryWithBackoff(async () => {
      const response = await client.put<ClickUpTask>(
        `/task/${task.externalId}`,
        updateRequest
      );
      return response.data;
    });

    return mapClickUpTaskToIntegrated(updatedTask);
  }

  async deleteTask(externalId: string, config: IntegrationConfig): Promise<void> {
    const client = this.createClient(config);

    await retryWithBackoff(async () => {
      await client.delete(`/task/${externalId}`);
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
      // Fetch all tasks from ClickUp
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

    // Get user's teams
    const teams = await this.getAuthorizedTeams(config.integrationConfig);

    if (teams.length === 0) {
      throw new Error('No teams found for user');
    }

    const teamId = teams[0].id;

    const webhookRequest: CreateWebhookRequest = {
      endpoint: config.webhookUrl,
      events: [
        ClickUpWebhookEvent.TASK_CREATED,
        ClickUpWebhookEvent.TASK_UPDATED,
        ClickUpWebhookEvent.TASK_DELETED,
        ClickUpWebhookEvent.TASK_STATUS_UPDATED,
        ClickUpWebhookEvent.TASK_PRIORITY_UPDATED,
      ],
    };

    const webhook = await retryWithBackoff(async () => {
      const response = await client.post<ClickUpWebhook>(
        `/team/${teamId}/webhook`,
        webhookRequest
      );
      return response.data;
    });

    return {
      webhookId: webhook.id,
      secret: webhook.webhook.secret,
    };
  }

  async unregisterWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookId: string;
  }): Promise<void> {
    const client = this.createClient(config.integrationConfig);

    await retryWithBackoff(async () => {
      await client.delete(`/webhook/${config.webhookId}`);
    });
  }

  validateWebhook(payload: WebhookPayload, secret: string): boolean {
    if (!payload.signature) {
      return false;
    }

    // ClickUp uses HMAC-SHA256 signature
    // The signature is sent in the X-Signature header
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
      const clickUpPayload = payload.data as unknown as ClickUpWebhookPayload;
      const eventType = clickUpPayload.event;

      switch (eventType) {
        case ClickUpWebhookEvent.TASK_CREATED:
          result.tasksCreated = 1;
          break;
        case ClickUpWebhookEvent.TASK_UPDATED:
        case ClickUpWebhookEvent.TASK_STATUS_UPDATED:
        case ClickUpWebhookEvent.TASK_PRIORITY_UPDATED:
        case ClickUpWebhookEvent.TASK_ASSIGNEE_UPDATED:
        case ClickUpWebhookEvent.TASK_DUE_DATE_UPDATED:
          result.tasksUpdated = 1;
          break;
        case ClickUpWebhookEvent.TASK_DELETED:
          result.tasksDeleted = 1;
          break;
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
      }

      // TODO: Actually sync the task with the database
      console.log(`Processed webhook event ${eventType} for task ${clickUpPayload.task_id}`);
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
      const response = await client.get('/user');

      const rateLimitInfo = extractRateLimitInfo(response.headers as Record<string, string>);

      if (rateLimitInfo) {
        return rateLimitInfo;
      }
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
    }

    // Return default rate limit for ClickUp (100 requests per minute per team)
    return {
      limit: 100,
      remaining: 100,
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
  }> {
    const client = this.createClient(config);

    const user = await retryWithBackoff(async () => {
      const response = await client.get<{ user: ClickUpUser }>('/user');
      return response.data.user;
    });

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.username,
    };
  }

  // ========== Helper Methods ==========

  private createClient(config: IntegrationConfig): HttpClient {
    return createHttpClient({
      baseUrl: this.baseUrl,
      tokens: config.tokens,
    });
  }

  private async getAuthorizedTeams(config: IntegrationConfig): Promise<ClickUpTeam[]> {
    const client = this.createClient(config);

    const response = await retryWithBackoff(async () => {
      const result = await client.get<{ teams: ClickUpTeam[] }>('/team');
      return result.data;
    });

    return response.teams;
  }
}
