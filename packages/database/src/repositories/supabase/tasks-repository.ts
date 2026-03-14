/**
 * Supabase implementation of ITasksRepository
 *
 * Uses Supabase client with Row Level Security (RLS) for access control.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types';
import type {
  ITasksRepository,
  Task,
  TaskInsert,
  TaskUpdate,
  TaskFilter,
} from '../tasks-repository';
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
 * Supabase implementation of tasks repository
 */
export class SupabaseTasksRepository implements ITasksRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getById(id: string, userId: string): Promise<DbResult<Task>> {
    const { data, error } = await this.supabase
      .from('tasks')
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
    filter: TaskFilter,
    pagination?: PaginationOptions,
    order?: OrderOptions<Task>
  ): Promise<DbResult<Task[]>> {
    let query = this.supabase.from('tasks').select('*');

    // Apply filters
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.priority) {
      query = query.eq('priority', filter.priority);
    }
    if (filter.type) {
      query = query.eq('type', filter.type);
    }
    if (filter.integrationId) {
      query = query.eq('integration_id', filter.integrationId);
    }
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }
    if (filter.dueDateBefore) {
      query = query.lte('due_date', filter.dueDateBefore);
    }
    if (filter.dueDateAfter) {
      query = query.gte('due_date', filter.dueDateAfter);
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

  async create(task: TaskInsert): Promise<DbResult<Task>> {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async update(id: string, userId: string, updates: TaskUpdate): Promise<DbResult<Task>> {
    const { data, error } = await this.supabase
      .from('tasks')
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
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: null, error: null };
  }

  async count(filter: TaskFilter): Promise<DbResult<number>> {
    let query = this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    // Apply same filters as getMany
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    if (filter.priority) {
      query = query.eq('priority', filter.priority);
    }
    if (filter.type) {
      query = query.eq('type', filter.type);
    }
    if (filter.integrationId) {
      query = query.eq('integration_id', filter.integrationId);
    }
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }
    if (filter.dueDateBefore) {
      query = query.lte('due_date', filter.dueDateBefore);
    }
    if (filter.dueDateAfter) {
      query = query.gte('due_date', filter.dueDateAfter);
    }

    const { count, error } = await query;

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: count || 0, error: null };
  }
}
