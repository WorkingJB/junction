/**
 * Agents Repository Interface
 *
 * Defines the contract for agent database operations.
 */

import type { Database } from '../types';
import type { DbResult, PaginationOptions, OrderOptions } from './types';

// Type aliases for agent data
export type Agent = Database['public']['Tables']['agents']['Row'];
export type AgentInsert = Database['public']['Tables']['agents']['Insert'];
export type AgentUpdate = Database['public']['Tables']['agents']['Update'];
export type AgentStatus = Database['public']['Enums']['agent_status'];

/**
 * Filter options for querying agents
 */
export interface AgentFilter {
  userId?: string;
  status?: AgentStatus;
  type?: string;
  search?: string; // Search in name
}

/**
 * Agents repository interface
 */
export interface IAgentsRepository {
  /**
   * Get a single agent by ID
   * @param id Agent ID
   * @param userId User ID for RLS check
   */
  getById(id: string, userId: string): Promise<DbResult<Agent>>;

  /**
   * Get an agent by API key
   * @param apiKey Agent API key
   */
  getByApiKey(apiKey: string): Promise<DbResult<Agent>>;

  /**
   * Get all agents matching the filter
   * @param filter Filter options
   * @param pagination Pagination options
   * @param order Order options
   */
  getMany(
    filter: AgentFilter,
    pagination?: PaginationOptions,
    order?: OrderOptions<Agent>
  ): Promise<DbResult<Agent[]>>;

  /**
   * Create a new agent
   * @param agent Agent data to insert
   */
  create(agent: AgentInsert): Promise<DbResult<Agent>>;

  /**
   * Update an existing agent
   * @param id Agent ID
   * @param userId User ID for RLS check
   * @param updates Agent updates
   */
  update(id: string, userId: string, updates: AgentUpdate): Promise<DbResult<Agent>>;

  /**
   * Update agent heartbeat
   * @param id Agent ID
   * @param userId User ID for RLS check
   */
  updateHeartbeat(id: string, userId: string): Promise<DbResult<Agent>>;

  /**
   * Delete an agent
   * @param id Agent ID
   * @param userId User ID for RLS check
   */
  delete(id: string, userId: string): Promise<DbResult<void>>;
}
