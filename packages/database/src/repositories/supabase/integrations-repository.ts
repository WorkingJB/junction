/**
 * Supabase implementation of IIntegrationsRepository
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types';
import type {
  IIntegrationsRepository,
  TaskIntegration,
  TaskIntegrationInsert,
  TaskIntegrationUpdate,
  IntegrationFilter,
  IntegrationProvider,
} from '../integrations-repository';
import type { DbResult, PaginationOptions } from '../types';

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
 * Supabase implementation of integrations repository
 */
export class SupabaseIntegrationsRepository implements IIntegrationsRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getById(id: string, userId: string): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async getByUserAndProvider(userId: string, provider: IntegrationProvider): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async getMany(
    filter: IntegrationFilter,
    pagination?: PaginationOptions
  ): Promise<DbResult<TaskIntegration[]>> {
    let query = this.supabase.from('task_integrations').select('*');

    // Apply filters
    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }
    if (filter.provider) {
      query = query.eq('provider', filter.provider);
    }
    if (filter.syncEnabled !== undefined) {
      query = query.eq('sync_enabled', filter.syncEnabled);
    }

    // Default ordering: most recently created first
    query = query.order('created_at', { ascending: false });

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

  async create(integration: TaskIntegrationInsert): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .insert(integration)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async update(id: string, userId: string, updates: TaskIntegrationUpdate): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
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
      .from('task_integrations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: null, error: null };
  }

  async updateLastSync(id: string, userId: string): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async updateLastPoll(id: string, userId: string): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .update({ last_poll_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async recordSyncError(id: string, userId: string, errorMessage: string): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .update({
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
        sync_errors: this.supabase.rpc('increment_sync_errors', { integration_id: id }) as any,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // If RPC doesn't exist, fall back to manual increment
      const { data: current } = await this.supabase
        .from('task_integrations')
        .select('sync_errors')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      const { data: updated, error: updateError } = await this.supabase
        .from('task_integrations')
        .update({
          last_error: errorMessage,
          last_error_at: new Date().toISOString(),
          sync_errors: (current?.sync_errors || 0) + 1,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: toDbError(updateError) };
      }

      return { data: updated, error: null };
    }

    return { data, error: null };
  }

  async clearSyncErrors(id: string, userId: string): Promise<DbResult<TaskIntegration>> {
    const { data, error } = await this.supabase
      .from('task_integrations')
      .update({
        last_error: null,
        last_error_at: null,
        sync_errors: 0,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async getIntegrationsNeedingPoll(): Promise<DbResult<TaskIntegration[]>> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from('task_integrations')
      .select('*')
      .eq('sync_enabled', true)
      .eq('requires_polling', true)
      .or('last_poll_at.is.null,last_poll_at.lt.' + new Date(now.getTime() - 5 * 60 * 1000).toISOString());

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data: data || [], error: null };
  }
}
