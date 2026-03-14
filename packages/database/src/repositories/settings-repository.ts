/**
 * User Settings Repository Interface
 *
 * Defines the contract for user settings database operations.
 */

import type { Database } from '../types';
import type { DbResult } from './types';

// Type aliases for settings data
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];

/**
 * User Settings repository interface
 */
export interface IUserSettingsRepository {
  /**
   * Get user settings by user ID
   * Creates default settings if none exist
   * @param userId User ID
   */
  getByUserId(userId: string): Promise<DbResult<UserSettings>>;

  /**
   * Update user settings
   * @param userId User ID
   * @param updates Settings updates
   */
  update(userId: string, updates: UserSettingsUpdate): Promise<DbResult<UserSettings>>;

  /**
   * Create default settings for a user
   * @param userId User ID
   */
  createDefault(userId: string): Promise<DbResult<UserSettings>>;
}
