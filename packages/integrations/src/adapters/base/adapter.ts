/**
 * Base adapter interface for task integration providers
 * All provider-specific adapters must implement this interface
 */

import type {
  IntegratedTask,
  IntegrationConfig,
  OAuthTokens,
  SyncResult,
  WebhookPayload,
  RateLimitInfo,
  TaskConflict,
} from '../../types/common';
import { ConflictResolution } from '../../types/common';

/**
 * Base interface that all integration adapters must implement
 */
export interface IntegrationAdapter {
  /**
   * Get the provider name
   */
  readonly provider: string;

  /**
   * Get the base API URL for this provider
   */
  readonly baseUrl: string;

  /**
   * Whether this provider supports webhooks
   */
  readonly supportsWebhooks: boolean;

  /**
   * Whether this provider requires polling
   */
  readonly requiresPolling: boolean;

  // ========== OAuth Methods ==========

  /**
   * Get the OAuth authorization URL for user consent
   */
  getAuthorizationUrl(config: {
    clientId: string;
    redirectUri: string;
    state: string;
    scopes?: string[];
  }): string;

  /**
   * Exchange authorization code for access tokens
   */
  exchangeCodeForTokens(config: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<OAuthTokens>;

  /**
   * Refresh expired access token
   */
  refreshAccessToken(config: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<OAuthTokens>;

  /**
   * Revoke access tokens
   */
  revokeAccess(tokens: OAuthTokens): Promise<void>;

  // ========== Task Sync Methods ==========

  /**
   * Fetch all tasks from the external provider
   */
  fetchTasks(config: IntegrationConfig): Promise<IntegratedTask[]>;

  /**
   * Create a task in the external provider
   */
  createTask(task: IntegratedTask, config: IntegrationConfig): Promise<IntegratedTask>;

  /**
   * Update a task in the external provider
   */
  updateTask(task: IntegratedTask, config: IntegrationConfig): Promise<IntegratedTask>;

  /**
   * Delete a task in the external provider
   */
  deleteTask(externalId: string, config: IntegrationConfig): Promise<void>;

  /**
   * Perform a full sync between Orqestr and the external provider
   */
  syncTasks(config: IntegrationConfig): Promise<SyncResult>;

  // ========== Webhook Methods ==========

  /**
   * Register a webhook with the external provider
   */
  registerWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookUrl: string;
    events: string[];
  }): Promise<{
    webhookId: string;
    secret?: string;
  }>;

  /**
   * Unregister a webhook from the external provider
   */
  unregisterWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookId: string;
  }): Promise<void>;

  /**
   * Validate webhook signature
   */
  validateWebhook(payload: WebhookPayload, secret: string): boolean;

  /**
   * Process incoming webhook payload
   */
  processWebhook(payload: WebhookPayload, config: IntegrationConfig): Promise<SyncResult>;

  // ========== Rate Limiting ==========

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(config: IntegrationConfig): Promise<RateLimitInfo>;

  /**
   * Check if we should throttle requests
   */
  shouldThrottle(config: IntegrationConfig): Promise<boolean>;

  // ========== Conflict Resolution ==========

  /**
   * Resolve conflicts between local and external tasks
   */
  resolveConflict(
    conflict: TaskConflict,
    strategy: ConflictResolution
  ): Promise<IntegratedTask>;

  // ========== Utility Methods ==========

  /**
   * Test the connection to the external provider
   */
  testConnection(config: IntegrationConfig): Promise<boolean>;

  /**
   * Get user information from the external provider
   */
  getUserInfo(config: IntegrationConfig): Promise<{
    id: string;
    email?: string;
    name?: string;
  }>;
}

/**
 * Abstract base class with common implementation
 */
export abstract class BaseIntegrationAdapter implements IntegrationAdapter {
  abstract readonly provider: string;
  abstract readonly baseUrl: string;
  abstract readonly supportsWebhooks: boolean;
  abstract readonly requiresPolling: boolean;

  // Default conflict resolution implementation
  async resolveConflict(
    conflict: TaskConflict,
    strategy: ConflictResolution
  ): Promise<IntegratedTask> {
    switch (strategy) {
      case ConflictResolution.LAST_WRITE_WINS:
        return conflict.localUpdatedAt > conflict.externalUpdatedAt
          ? conflict.localTask
          : conflict.externalTask;

      case ConflictResolution.EXTERNAL_WINS:
        return conflict.externalTask;

      case ConflictResolution.LOCAL_WINS:
        return conflict.localTask;

      case ConflictResolution.MANUAL:
        // For manual resolution, we'll keep the local version
        // and flag it for user review (implementation specific)
        return conflict.localTask;

      default:
        return conflict.localTask;
    }
  }

  // Default throttle check
  async shouldThrottle(config: IntegrationConfig): Promise<boolean> {
    try {
      const rateLimit = await this.getRateLimitInfo(config);
      // Throttle if less than 10% of rate limit remaining
      return rateLimit.remaining < rateLimit.limit * 0.1;
    } catch {
      // If we can't get rate limit info, don't throttle
      return false;
    }
  }

  // Abstract methods that must be implemented by each provider
  abstract getAuthorizationUrl(config: {
    clientId: string;
    redirectUri: string;
    state: string;
    scopes?: string[];
  }): string;

  abstract exchangeCodeForTokens(config: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<OAuthTokens>;

  abstract refreshAccessToken(config: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<OAuthTokens>;

  abstract revokeAccess(tokens: OAuthTokens): Promise<void>;

  abstract fetchTasks(config: IntegrationConfig): Promise<IntegratedTask[]>;

  abstract createTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask>;

  abstract updateTask(
    task: IntegratedTask,
    config: IntegrationConfig
  ): Promise<IntegratedTask>;

  abstract deleteTask(externalId: string, config: IntegrationConfig): Promise<void>;

  abstract syncTasks(config: IntegrationConfig): Promise<SyncResult>;

  abstract registerWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookUrl: string;
    events: string[];
  }): Promise<{ webhookId: string; secret?: string }>;

  abstract unregisterWebhook(config: {
    integrationConfig: IntegrationConfig;
    webhookId: string;
  }): Promise<void>;

  abstract validateWebhook(payload: WebhookPayload, secret: string): boolean;

  abstract processWebhook(
    payload: WebhookPayload,
    config: IntegrationConfig
  ): Promise<SyncResult>;

  abstract getRateLimitInfo(config: IntegrationConfig): Promise<RateLimitInfo>;

  abstract testConnection(config: IntegrationConfig): Promise<boolean>;

  abstract getUserInfo(config: IntegrationConfig): Promise<{
    id: string;
    email?: string;
    name?: string;
  }>;
}
