/**
 * Integrations Repository Interface
 *
 * Defines the contract for task integrations database operations.
 */

import type { Database } from '../types';
import type { DbResult, PaginationOptions } from './types';

// Type aliases for integration data
export type TaskIntegration = Database['public']['Tables']['task_integrations']['Row'];
export type TaskIntegrationInsert = Database['public']['Tables']['task_integrations']['Insert'];
export type TaskIntegrationUpdate = Database['public']['Tables']['task_integrations']['Update'];
export type IntegrationProvider = Database['public']['Enums']['integration_provider'];

/**
 * Filter options for querying integrations
 */
export interface IntegrationFilter {
  userId?: string;
  provider?: IntegrationProvider;
  syncEnabled?: boolean;
}

/**
 * Task Integrations repository interface
 */
export interface IIntegrationsRepository {
  /**
   * Get a single integration by ID
   * @param id Integration ID
   * @param userId User ID for RLS check
   */
  getById(id: string, userId: string): Promise<DbResult<TaskIntegration>>;

  /**
   * Get integration by user and provider
   * @param userId User ID
   * @param provider Integration provider
   */
  getByUserAndProvider(userId: string, provider: IntegrationProvider): Promise<DbResult<TaskIntegration>>;

  /**
   * Get all integrations matching the filter
   * @param filter Filter options
   * @param pagination Pagination options
   */
  getMany(
    filter: IntegrationFilter,
    pagination?: PaginationOptions
  ): Promise<DbResult<TaskIntegration[]>>;

  /**
   * Create a new integration
   * @param integration Integration data to insert
   */
  create(integration: TaskIntegrationInsert): Promise<DbResult<TaskIntegration>>;

  /**
   * Update an existing integration
   * @param id Integration ID
   * @param userId User ID for RLS check
   * @param updates Integration updates
   */
  update(id: string, userId: string, updates: TaskIntegrationUpdate): Promise<DbResult<TaskIntegration>>;

  /**
   * Delete an integration
   * @param id Integration ID
   * @param userId User ID for RLS check
   */
  delete(id: string, userId: string): Promise<DbResult<void>>;

  /**
   * Update last sync time
   * @param id Integration ID
   * @param userId User ID for RLS check
   */
  updateLastSync(id: string, userId: string): Promise<DbResult<TaskIntegration>>;

  /**
   * Update last poll time
   * @param id Integration ID
   * @param userId User ID for RLS check
   */
  updateLastPoll(id: string, userId: string): Promise<DbResult<TaskIntegration>>;

  /**
   * Record sync error
   * @param id Integration ID
   * @param userId User ID for RLS check
   * @param errorMessage Error message
   */
  recordSyncError(id: string, userId: string, errorMessage: string): Promise<DbResult<TaskIntegration>>;

  /**
   * Clear sync errors
   * @param id Integration ID
   * @param userId User ID for RLS check
   */
  clearSyncErrors(id: string, userId: string): Promise<DbResult<TaskIntegration>>;

  /**
   * Get integrations that need polling
   * Filters for enabled integrations that require polling
   */
  getIntegrationsNeedingPoll(): Promise<DbResult<TaskIntegration[]>>;
}
