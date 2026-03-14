/**
 * Repository interface for agent costs
 */

import type { Database } from '../types';
import type { DbResult } from './types';

// Type aliases for agent cost data
export type AgentCost = Database['public']['Tables']['agent_costs']['Row'];
export type AgentCostInsert = Database['public']['Tables']['agent_costs']['Insert'];
export type AgentCostUpdate = Database['public']['Tables']['agent_costs']['Update'];

/**
 * Filter options for querying agent costs
 */
export interface AgentCostFilter {
  userId: string;
  agentId?: string;
  agentTaskId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Summary statistics for agent costs
 */
export interface AgentCostSummary {
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  count: number;
}

/**
 * Agent cost with agent details
 */
export interface AgentCostWithAgent extends AgentCost {
  agents?: {
    name: string;
    type: string;
  } | null;
}

/**
 * Interface for agent costs repository operations
 */
export interface IAgentCostsRepository {
  /**
   * Get costs with optional filtering
   */
  getMany(filter: AgentCostFilter): Promise<DbResult<AgentCost[]>>;

  /**
   * Get costs with agent details joined
   */
  getManyWithAgents(filter: AgentCostFilter): Promise<DbResult<AgentCostWithAgent[]>>;

  /**
   * Log a new cost entry
   */
  create(cost: AgentCostInsert): Promise<DbResult<AgentCost>>;

  /**
   * Calculate summary statistics for filtered costs
   */
  getSummary(filter: AgentCostFilter): Promise<DbResult<AgentCostSummary>>;
}
