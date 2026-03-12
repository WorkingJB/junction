/**
 * Task synchronization service
 * Handles bidirectional sync between Orqestr and external providers with conflict resolution
 */

import type {
  IntegrationAdapter,
  IntegratedTask,
  IntegrationConfig,
  TaskConflict,
  SyncResult,
} from '@junction/integrations';
import { detectTaskChanges, validateTask, ConflictResolution } from '@junction/integrations';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@junction/database';

type Task = Database['public']['Tables']['tasks']['Row'];

/**
 * Sync tasks between Orqestr and an external provider
 */
export async function syncTasksWithProvider(
  adapter: IntegrationAdapter,
  config: IntegrationConfig,
  conflictStrategy: ConflictResolution = ConflictResolution.LAST_WRITE_WINS
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    tasksCreated: 0,
    tasksUpdated: 0,
    tasksDeleted: 0,
    errors: [],
  };

  try {
    const supabase = await createClient();

    // Fetch tasks from external provider
    const externalTasks = await adapter.fetchTasks(config);

    // Fetch local tasks for this integration
    // @ts-ignore - Database types need to be regenerated
    const { data: localTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', config.userId)
      .eq('integration_provider', config.provider);

    if (fetchError) {
      throw new Error(`Failed to fetch local tasks: ${fetchError.message}`);
    }

    // Create maps for efficient lookups
    const externalTaskMap = new Map(
      externalTasks.map((t) => [t.externalId, t])
    );
    const localTaskMap = new Map(
      ((localTasks as any[]) || [])
        .filter((t) => t.external_id)
        .map((t) => [t.external_id!, t])
    );

    // Process external tasks
    for (const externalTask of externalTasks) {
      try {
        const localTask = localTaskMap.get(externalTask.externalId);

        if (!localTask) {
          // Task doesn't exist locally - create it
          await createLocalTask(supabase, externalTask, config.userId);
          result.tasksCreated++;
        } else {
          // Task exists - check for conflicts and update
          const conflict = detectConflict(localTask, externalTask);

          if (conflict) {
            // Resolve conflict
            const resolved = await adapter.resolveConflict(
              conflict,
              conflictStrategy
            );

            // Update both local and external if needed
            await handleConflictResolution(
              supabase,
              adapter,
              config,
              localTask,
              resolved,
              conflictStrategy
            );
            result.tasksUpdated++;
          }
        }

        // Remove from local map to track deletions
        localTaskMap.delete(externalTask.externalId);
      } catch (error) {
        result.errors.push({
          externalId: externalTask.externalId,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    // Handle local tasks that don't exist externally (deleted or need to be pushed)
    for (const [externalId, localTask] of localTaskMap) {
      try {
        // Check if task was recently updated locally
        const updatedRecently =
          new Date(localTask.updated_at).getTime() >
          Date.now() - 5 * 60 * 1000; // 5 minutes

        if (updatedRecently && !localTask.deleted_at) {
          // Task was updated locally but doesn't exist externally - recreate it
          const integratedTask = convertLocalToIntegrated(localTask);
          await adapter.createTask(integratedTask, config);
          result.tasksCreated++;
        } else {
          // Task was deleted externally - delete locally
          // @ts-ignore - Database types need to be regenerated
          const deleteResult = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', localTask.id);
          result.tasksDeleted++;
        }
      } catch (error) {
        result.errors.push({
          taskId: localTask.id,
          externalId,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    // Update last sync time
    // @ts-ignore - Database types need to be regenerated
    const syncUpdateResult = await supabase.from('task_integrations').update({
        last_sync: new Date().toISOString(),
        sync_errors: result.errors.length > 0 ? result.errors.length : 0,
        last_error: result.errors[0]?.message || null,
        last_error_at: result.errors.length > 0 ? new Date().toISOString() : null,
      }).eq('id', config.id);
  } catch (error) {
    result.success = false;
    result.errors.push({
      message: error instanceof Error ? error.message : 'Unknown sync error',
      timestamp: new Date(),
    });
  }

  return result;
}

/**
 * Detect conflicts between local and external tasks
 */
function detectConflict(
  localTask: Task,
  externalTask: IntegratedTask
): TaskConflict | null {
  const localIntegrated = convertLocalToIntegrated(localTask);

  const changes = detectTaskChanges(localIntegrated, externalTask);

  if (!changes.hasChanges) {
    return null;
  }

  return {
    localTask: localIntegrated,
    externalTask,
    conflictFields: changes.changedFields,
    localUpdatedAt: new Date(localTask.updated_at),
    externalUpdatedAt: externalTask.updatedAt || new Date(),
  };
}

/**
 * Handle conflict resolution by updating appropriate systems
 */
async function handleConflictResolution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adapter: IntegrationAdapter,
  config: IntegrationConfig,
  localTask: Task,
  resolvedTask: IntegratedTask,
  strategy: ConflictResolution
) {
  const localIntegrated = convertLocalToIntegrated(localTask);

  // Determine which system to update based on the resolved task
  const shouldUpdateLocal = resolvedTask.updatedAt !== localIntegrated.updatedAt;
  const shouldUpdateExternal =
    resolvedTask.updatedAt !== resolvedTask.updatedAt;

  if (shouldUpdateLocal) {
    // Update local task
    await updateLocalTask(supabase, localTask.id, resolvedTask);
  }

  if (shouldUpdateExternal && strategy !== ConflictResolution.LOCAL_WINS) {
    // Update external task
    await adapter.updateTask(resolvedTask, config);
  }
}

/**
 * Create a local task from external task
 */
async function createLocalTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  externalTask: IntegratedTask,
  userId: string
) {
  const validation = validateTask(externalTask);
  if (!validation.valid) {
    throw new Error(`Invalid task: ${validation.errors.join(', ')}`);
  }

  // @ts-ignore - Database types need to be regenerated
  const { error } = await supabase.from('tasks').insert({
    user_id: userId,
    title: externalTask.title,
    description: externalTask.description,
    status: externalTask.status,
    priority: externalTask.priority,
    due_date: externalTask.dueDate?.toISOString(),
    integration_provider: externalTask.provider,
    external_id: externalTask.externalId,
    external_url: externalTask.externalUrl,
    integration_metadata: externalTask.metadata as Record<string, unknown>,
  });

  if (error) {
    throw new Error(`Failed to create local task: ${error.message}`);
  }
}

/**
 * Update a local task with external changes
 */
async function updateLocalTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  externalTask: IntegratedTask
) {
  // @ts-ignore - Database types need to be regenerated
  const { error } = await supabase.from('tasks').update({
      title: externalTask.title,
      description: externalTask.description,
      status: externalTask.status,
      priority: externalTask.priority,
      due_date: externalTask.dueDate?.toISOString(),
      external_url: externalTask.externalUrl,
      integration_metadata: externalTask.metadata as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);

  if (error) {
    throw new Error(`Failed to update local task: ${error.message}`);
  }
}

/**
 * Convert local task to IntegratedTask format
 */
function convertLocalToIntegrated(task: Task): IntegratedTask {
  const taskAny = task as any;
  return {
    id: taskAny.id,
    externalId: taskAny.external_id || '',
    title: taskAny.title,
    description: taskAny.description || undefined,
    status: taskAny.status,
    priority: taskAny.priority,
    dueDate: taskAny.due_date ? new Date(taskAny.due_date) : undefined,
    createdAt: new Date(taskAny.created_at),
    updatedAt: new Date(taskAny.updated_at),
    externalUrl: taskAny.external_url || undefined,
    provider: taskAny.integration_provider!,
    metadata: (taskAny.integration_metadata as Record<string, unknown>) || {},
  };
}

/**
 * Sync a single task to external provider
 */
export async function syncTaskToProvider(
  adapter: IntegrationAdapter,
  config: IntegrationConfig,
  taskId: string
): Promise<void> {
  const supabase = await createClient();

  // Fetch the task
  // @ts-ignore - Database types need to be regenerated
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !task) {
    throw new Error('Task not found');
  }

  const taskAny = task as any;
  const integratedTask = convertLocalToIntegrated(taskAny);

  if (taskAny.external_id) {
    // Update existing external task
    await adapter.updateTask(integratedTask, config);
  } else {
    // Create new external task
    const created = await adapter.createTask(integratedTask, config);

    // Update local task with external ID
    // @ts-ignore - Database types need to be regenerated
    const updateResult = await supabase.from('tasks').update({ external_id: created.externalId, external_url: created.externalUrl }).eq('id', taskId);
  }
}
