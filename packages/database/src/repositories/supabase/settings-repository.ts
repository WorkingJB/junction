/**
 * Supabase implementation of IUserSettingsRepository
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types';
import type {
  IUserSettingsRepository,
  UserSettings,
  UserSettingsUpdate,
} from '../settings-repository';
import type { DbResult } from '../types';

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
 * Supabase implementation of user settings repository
 */
export class SupabaseUserSettingsRepository implements IUserSettingsRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getByUserId(userId: string): Promise<DbResult<UserSettings>> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no settings exist, create default settings
      if (error.code === 'PGRST116') {
        return this.createDefault(userId);
      }
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async update(userId: string, updates: UserSettingsUpdate): Promise<DbResult<UserSettings>> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }

  async createDefault(userId: string): Promise<DbResult<UserSettings>> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) {
      return { data: null, error: toDbError(error) };
    }

    return { data, error: null };
  }
}
