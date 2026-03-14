/**
 * Tasks Repository Interface
 *
 * Defines the contract for task database operations.
 * Provider-agnostic interface that can be implemented with any backend.
 */

import type { Database } from '../types';
import type { DbResult, PaginationOptions, OrderOptions } from './types';

// Type aliases for task data
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type TaskPriority = Database['public']['Enums']['task_priority'];
export type TaskType = Database['public']['Enums']['task_type'];

/**
 * Filter options for querying tasks
 */
export interface TaskFilter {
  userId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  search?: string; // Search in title and description
  integrationId?: string;
  dueDateBefore?: string;
  dueDateAfter?: string;
}

/**
 * Tasks repository interface
 */
export interface ITasksRepository {
  /**
   * Get a single task by ID
   * @param id Task ID
   * @param userId User ID for RLS check
   */
  getById(id: string, userId: string): Promise<DbResult<Task>>;

  /**
   * Get all tasks matching the filter
   * @param filter Filter options
   * @param pagination Pagination options
   * @param order Order options
   */
  getMany(
    filter: TaskFilter,
    pagination?: PaginationOptions,
    order?: OrderOptions<Task>
  ): Promise<DbResult<Task[]>>;

  /**
   * Create a new task
   * @param task Task data to insert
   */
  create(task: TaskInsert): Promise<DbResult<Task>>;

  /**
   * Update an existing task
   * @param id Task ID
   * @param userId User ID for RLS check
   * @param updates Task updates
   */
  update(id: string, userId: string, updates: TaskUpdate): Promise<DbResult<Task>>;

  /**
   * Delete a task
   * @param id Task ID
   * @param userId User ID for RLS check
   */
  delete(id: string, userId: string): Promise<DbResult<void>>;

  /**
   * Count tasks matching the filter
   * @param filter Filter options
   */
  count(filter: TaskFilter): Promise<DbResult<number>>;
}
