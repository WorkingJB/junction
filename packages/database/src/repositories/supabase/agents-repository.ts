/**
 * Supabase implementation of IAgentsRepository
 *
 * Uses Supabase client with Row Level Security (RLS) for access control.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types';
import type {
  IAgentsRepository,
  Agent,
  AgentInsert,
  AgentUpdate,
  AgentFilter,
} from '../agents-repository';
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
 * Supabase implementation of agents repository
 */
export class SupabaseAgentsRepository implements IAgentsRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getById(id: string, userId: string): Promise<DbResult<Agent>> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async getByApiKey(apiKey: string): Promise<DbResult<Agent>> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async getMany(
    filter: AgentFilter,
    pagination?: PaginationOptions,
    order?: OrderOptions<Agent>
  ): Promise<DbResult<Agent[]>> {
    let query = this.supabase.from('agents').select('*');

    // Apply filters
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.type) {
      query = query.eq('type', filter.type);
    }
    if (filter.search) {
      query = query.ilike('name', `%${filter.search}%`);
    }

    // Apply ordering
    if (order) {
      query = query.order(order.column as string, { ascending: order.ascending ?? false });
    } else {
      // Default ordering: most recently active first
      query = query.order('last_heartbeat', { ascending: false, nullsFirst: false });
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

  async create(agent: AgentInsert): Promise<DbResult<Agent>> {
    const { data, error } = await this.supabase
      .from('agents')
      .insert(agent)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async update(id: string, userId: string, updates: AgentUpdate): Promise<DbResult<Agent>> {
    const { data, error } = await this.supabase
      .from('agents')
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

  async updateHeartbeat(id: string, userId: string): Promise<DbResult<Agent>> {
    const { data, error } = await this.supabase
      .from('agents')
      .update({ last_heartbeat: new Date().toISOString() })
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
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: null, error: null };
  }
}
