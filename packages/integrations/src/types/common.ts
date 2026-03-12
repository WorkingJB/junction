/**
 * Common types for task integration adapters
 * These types provide a standardized interface between external providers and Orqestr
 */

import type { Database } from '@junction/database';

export type IntegrationProvider = Database['public']['Enums']['integration_provider'];

export type TaskPriority = Database['public']['Enums']['task_priority'];
export type TaskStatus = Database['public']['Enums']['task_status'];

/**
 * Standardized task structure for cross-platform integration
 */
export interface IntegratedTask {
  // Orqestr fields
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Integration metadata
  externalId: string;
  externalUrl?: string;
  provider: IntegrationProvider;

  // Additional provider-specific data
  metadata?: Record<string, unknown>;
}

/**
 * OAuth token data structure
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  tokens: OAuthTokens;
  syncEnabled: boolean;
  webhookId?: string;
  webhookSecret?: string;
  webhookUrl?: string;
  requiresPolling: boolean;
  pollingIntervalMinutes?: number;
  lastSyncAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  provider: IntegrationProvider;
  signature?: string;
  timestamp?: string;
  eventType: string;
  data: Record<string, unknown>;
}

/**
 * Sync result information
 */
export interface SyncResult {
  success: boolean;
  tasksCreated: number;
  tasksUpdated: number;
  tasksDeleted: number;
  errors: SyncError[];
}

/**
 * Sync error details
 */
export interface SyncError {
  taskId?: string;
  externalId?: string;
  message: string;
  code?: string;
  timestamp: Date;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
  /** Use the most recently updated version (default) */
  LAST_WRITE_WINS = 'last_write_wins',
  /** Prefer external provider's version */
  EXTERNAL_WINS = 'external_wins',
  /** Prefer Orqestr's version */
  LOCAL_WINS = 'local_wins',
  /** Create duplicate for manual resolution */
  MANUAL = 'manual',
}

/**
 * Conflict data for resolution
 */
export interface TaskConflict {
  localTask: IntegratedTask;
  externalTask: IntegratedTask;
  conflictFields: string[];
  localUpdatedAt: Date;
  externalUpdatedAt: Date;
}
