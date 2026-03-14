/**
 * Supabase implementation of IAgentTasksRepository
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types';
import type {
  IAgentTasksRepository,
  AgentTask,
  AgentTaskInsert,
  AgentTaskUpdate,
  AgentTaskFilter,
} from '../agent-tasks-repository';
import type { DbResult, PaginationOptions, OrderOptions } from '../types';

/**
 * Convert Supabase error to DbError
 */
function toDbError(error: any) {
  return {
    message: error.message || 'Database operation failed',
    code: error.code,
    details: error.details,
  };
}

/**
 * Supabase implementation of agent tasks repository
 */
export class SupabaseAgentTasksRepository implements IAgentTasksRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getById(id: string, userId: string): Promise<DbResult<AgentTask>> {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async getMany(
    filter: AgentTaskFilter,
    pagination?: PaginationOptions,
    order?: OrderOptions<AgentTask>
  ): Promise<DbResult<AgentTask[]>> {
    let query = this.supabase.from('agent_tasks').select('*');

    // Apply filters
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.agentId) {
      query = query.eq('agent_id', filter.agentId);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.priority) {
      query = query.eq('priority', filter.priority);
    }
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }

    // Apply ordering
    if (order) {
      query = query.order(order.column as string, { ascending: order.ascending ?? false });
    } else {
      // Default ordering: newest first
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset) {
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: data || [], error: null };
  }

  async create(task: AgentTaskInsert): Promise<DbResult<AgentTask>> {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async update(id: string, userId: string, updates: AgentTaskUpdate): Promise<DbResult<AgentTask>> {
    const { data, error } = await this.supabase
      .from('agent_tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async delete(id: string, userId: string): Promise<DbResult<void>> {
    const { error } = await this.supabase
      .from('agent_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: null, error: null };
  }

  async count(filter: AgentTaskFilter): Promise<DbResult<number>> {
    let query = this.supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true });

    // Apply same filters as getMany
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.agentId) {
      query = query.eq('agent_id', filter.agentId);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.priority) {
      query = query.eq('priority', filter.priority);
    }
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }

    const { count, error } = await query;

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: count || 0, error: null };
  }
}
