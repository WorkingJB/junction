/**
 * Agent Tasks Repository Interface
 *
 * Defines the contract for agent task database operations.
 */

import type { Database } from '../types';
import type { DbResult, PaginationOptions, OrderOptions } from './types';

// Type aliases for agent task data
export type AgentTask = Database['public']['Tables']['agent_tasks']['Row'];
export type AgentTaskInsert = Database['public']['Tables']['agent_tasks']['Insert'];
export type AgentTaskUpdate = Database['public']['Tables']['agent_tasks']['Update'];
export type AgentTaskStatus = Database['public']['Enums']['agent_task_status'];
export type AgentTaskPriority = Database['public']['Enums']['agent_task_priority'];

/**
 * Filter options for querying agent tasks
 */
export interface AgentTaskFilter {
  userId?: string;
  agentId?: string;
  status?: AgentTaskStatus;
  priority?: AgentTaskPriority;
  search?: string; // Search in title and description
}

/**
 * Agent Tasks repository interface
 */
export interface IAgentTasksRepository {
  /**
   * Get a single agent task by ID
   * @param id Agent task ID
   * @param userId User ID for RLS check
   */
  getById(id: string, userId: string): Promise<DbResult<AgentTask>>;

  /**
   * Get all agent tasks matching the filter
   * @param filter Filter options
   * @param pagination Pagination options
   * @param order Order options
   */
  getMany(
    filter: AgentTaskFilter,
    pagination?: PaginationOptions,
    order?: OrderOptions<AgentTask>
  ): Promise<DbResult<AgentTask[]>>;

  /**
   * Create a new agent task
   * @param task Agent task data to insert
   */
  create(task: AgentTaskInsert): Promise<DbResult<AgentTask>>;

  /**
   * Update an existing agent task
   * @param id Agent task ID
   * @param userId User ID for RLS check
   * @param updates Agent task updates
   */
  update(id: string, userId: string, updates: AgentTaskUpdate): Promise<DbResult<AgentTask>>;

  /**
   * Delete an agent task
   * @param id Agent task ID
   * @param userId User ID for RLS check
   */
  delete(id: string, userId: string): Promise<DbResult<void>>;

  /**
   * Count agent tasks matching the filter
   * @param filter Filter options
   */
  count(filter: AgentTaskFilter): Promise<DbResult<number>>;
}
