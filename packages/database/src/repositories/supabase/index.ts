/**
 * Supabase implementation of repositories
 *
 * Creates repository instances using Supabase client.
 */

import { createServerClient } from '@supabase/ssr';
import type { Database } from '../../types';
import type { IRepositories } from '../index';
import { SupabaseTasksRepository } from './tasks-repository';
import { SupabaseAgentsRepository } from './agents-repository';
import { SupabaseUserSettingsRepository } from './settings-repository';
import { SupabaseAgentTasksRepository } from './agent-tasks-repository';
import { SupabaseIntegrationsRepository } from './integrations-repository';
import { SupabaseAgentCostsRepository } from './agent-costs-repository';

/**
 * Create repository instances for use in server-side code
 *
 * @example
 * ```ts
 * import { createRepositories } from '@orqestr/database/repositories';
 *
 * const repos = await createRepositories();
 * const { data: tasks, error } = await repos.tasks.getMany({ userId: 'user-id' });
 * ```
 */
export async function createRepositories(): Promise<IRepositories> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
      auth: {
        storage: undefined,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  return {
    tasks: new SupabaseTasksRepository(supabase),
    agents: new SupabaseAgentsRepository(supabase),
    settings: new SupabaseUserSettingsRepository(supabase),
    agentTasks: new SupabaseAgentTasksRepository(supabase),
    integrations: new SupabaseIntegrationsRepository(supabase),
    agentCosts: new SupabaseAgentCostsRepository(supabase),
  };
}

// Export repository implementations for advanced usage
export { SupabaseTasksRepository } from './tasks-repository';
export { SupabaseAgentsRepository } from './agents-repository';
export { SupabaseUserSettingsRepository } from './settings-repository';
export { SupabaseAgentTasksRepository } from './agent-tasks-repository';
export { SupabaseIntegrationsRepository } from './integrations-repository';
export { SupabaseAgentCostsRepository } from './agent-costs-repository';
