/**
 * Supabase implementation of agent costs repository
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, AgentCost, AgentCostInsert } from '../../types';
import type {
  IAgentCostsRepository,
  AgentCostFilter,
  AgentCostSummary,
  AgentCostWithAgent,
} from '../agent-costs-repository';
import type { DbResult } from '../types';
import { toDbError } from './utils';

export class SupabaseAgentCostsRepository implements IAgentCostsRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getMany(filter: AgentCostFilter): Promise<DbResult<AgentCost[]>> {
    try {
      let query = this.supabase
        .from('agent_costs')
        .select('*')
        .eq('user_id', filter.userId)
        .order('timestamp', { ascending: false });

      if (filter.agentId) {
        query = query.eq('agent_id', filter.agentId);
      }
      if (filter.agentTaskId) {
        query = query.eq('agent_task_id', filter.agentTaskId);
      }
      if (filter.startDate) {
        query = query.gte('timestamp', filter.startDate);
      }
      if (filter.endDate) {
        query = query.lte('timestamp', filter.endDate);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: toDbError(error) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Failed to fetch agent costs', details: String(err) },
      };
    }
  }

  async getManyWithAgents(filter: AgentCostFilter): Promise<DbResult<AgentCostWithAgent[]>> {
    try {
      let query = this.supabase
        .from('agent_costs')
        .select('*, agents(name, type)')
        .eq('user_id', filter.userId)
        .order('timestamp', { ascending: false });

      if (filter.agentId) {
        query = query.eq('agent_id', filter.agentId);
      }
      if (filter.agentTaskId) {
        query = query.eq('agent_task_id', filter.agentTaskId);
      }
      if (filter.startDate) {
        query = query.gte('timestamp', filter.startDate);
      }
      if (filter.endDate) {
        query = query.lte('timestamp', filter.endDate);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: toDbError(error) };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Failed to fetch agent costs with agents', details: String(err) },
      };
    }
  }

  async create(cost: AgentCostInsert): Promise<DbResult<AgentCost>> {
    try {
      const { data, error } = await this.supabase
        .from('agent_costs')
        .insert(cost)
        .select()
        .single();

      if (error) {
        return { data: null, error: toDbError(error) };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Failed to create agent cost', details: String(err) },
      };
    }
  }

  async getSummary(filter: AgentCostFilter): Promise<DbResult<AgentCostSummary>> {
    try {
      // Fetch costs for the filter
      const { data: costs, error } = await this.getMany(filter);

      if (error || !costs) {
        return { data: null, error: error || { message: 'No costs found' } };
      }

      // Calculate summary
      const summary: AgentCostSummary = {
        total_cost_usd: costs.reduce((sum, cost) => sum + cost.cost_usd, 0),
        total_input_tokens: costs.reduce((sum, cost) => sum + cost.input_tokens, 0),
        total_output_tokens: costs.reduce((sum, cost) => sum + cost.output_tokens, 0),
        count: costs.length,
      };

      return { data: summary, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Failed to calculate cost summary', details: String(err) },
      };
    }
  }
}
