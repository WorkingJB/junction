/**
 * Database Repositories
 *
 * Repository pattern for database operations.
 * Provides a provider-agnostic interface for CRUD operations.
 *
 * Current implementation: Supabase with RLS
 * Future implementations: Prisma, Drizzle, etc.
 *
 * ## Usage
 *
 * ```ts
 * import { createRepositories } from '@orqestr/database/repositories';
 *
 * const repos = await createRepositories();
 * const { data: tasks, error } = await repos.tasks.getMany({ userId: 'user-id' });
 * ```
 */

// Types
export type { DbResult, DbError, PaginationOptions, OrderOptions } from './types';

// Tasks repository
export type {
  ITasksRepository,
  Task,
  TaskInsert,
  TaskUpdate,
  TaskFilter,
  TaskStatus,
  TaskPriority,
  TaskType,
} from './tasks-repository';

// Agents repository
export type {
  IAgentsRepository,
  Agent,
  AgentInsert,
  AgentUpdate,
  AgentFilter,
  AgentStatus,
} from './agents-repository';

// User Settings repository
export type {
  IUserSettingsRepository,
  UserSettings,
  UserSettingsUpdate,
  UserSettingsInsert,
} from './settings-repository';

// Agent Tasks repository
export type {
  IAgentTasksRepository,
  AgentTask,
  AgentTaskInsert,
  AgentTaskUpdate,
  AgentTaskFilter,
  AgentTaskStatus,
  AgentTaskPriority,
} from './agent-tasks-repository';

// Integrations repository
export type {
  IIntegrationsRepository,
  TaskIntegration,
  TaskIntegrationInsert,
  TaskIntegrationUpdate,
  IntegrationFilter,
  IntegrationProvider,
} from './integrations-repository';

// Agent Costs repository
export type {
  IAgentCostsRepository,
  AgentCost,
  AgentCostInsert,
  AgentCostUpdate,
  AgentCostFilter,
  AgentCostSummary,
  AgentCostWithAgent,
} from './agent-costs-repository';

/**
 * Repository collection interface
 * Groups all repositories together for easy access
 */
export interface IRepositories {
  tasks: ITasksRepository;
  agents: IAgentsRepository;
  settings: IUserSettingsRepository;
  agentTasks: IAgentTasksRepository;
  integrations: IIntegrationsRepository;
  agentCosts: IAgentCostsRepository;
}

// Supabase implementation (current)
export { createRepositories } from './supabase';
