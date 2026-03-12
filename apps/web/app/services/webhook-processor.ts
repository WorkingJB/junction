/**
 * Webhook processing service
 * Handles validation and processing of webhook payloads from integration providers
 */

import {
  TodoistAdapter,
  AsanaAdapter,
  ClickUpAdapter,
  type IntegrationProvider,
  type WebhookPayload,
  type SyncResult,
} from '@junction/integrations';
import { createClient } from '@/lib/supabase/server';

interface ProcessWebhookParams {
  provider: IntegrationProvider;
  signature: string | null;
  timestamp?: string;
  rawBody: string;
  payload: unknown;
}

interface ProcessWebhookResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  tasksCreated?: number;
  tasksUpdated?: number;
  tasksDeleted?: number;
}

/**
 * Get the appropriate adapter for a provider
 */
function getAdapter(provider: IntegrationProvider) {
  switch (provider) {
    case 'todoist':
      return new TodoistAdapter();
    case 'asana':
      return new AsanaAdapter();
    case 'clickup':
      return new ClickUpAdapter();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get integration config from database
 */
async function getIntegrationConfig(
  provider: IntegrationProvider,
  webhookId?: string
) {
  const supabase = await createClient();

  // Query the task_integrations table for this provider's config
  // @ts-ignore - Database types need to be regenerated
  let query = supabase
    .from('task_integrations')
    .select('*')
    .eq('provider', provider)
    .eq('sync_enabled', true);

  if (webhookId) {
    query = query.eq('webhook_id', webhookId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error(`Integration config not found for provider: ${provider}`);
  }

  const dataAny = data as any;

  return {
    id: dataAny.id,
    userId: dataAny.user_id,
    provider: dataAny.provider,
    tokens: {
      accessToken: dataAny.access_token,
      refreshToken: dataAny.refresh_token || undefined,
      expiresAt: dataAny.token_expires_at ? new Date(dataAny.token_expires_at) : undefined,
    },
    syncEnabled: dataAny.sync_enabled,
    webhookId: dataAny.webhook_id || undefined,
    webhookSecret: dataAny.webhook_secret || undefined,
    webhookUrl: dataAny.webhook_url || undefined,
    requiresPolling: dataAny.requires_polling || false,
    pollingIntervalMinutes: dataAny.polling_interval_minutes || undefined,
    lastSyncAt: dataAny.last_sync ? new Date(dataAny.last_sync) : undefined,
    metadata: dataAny.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Update integration sync status
 */
async function updateIntegrationStatus(
  integrationId: string,
  result: SyncResult
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    last_sync: new Date().toISOString(),
  };

  if (result.success) {
    // Reset error count on success
    updates.sync_errors = 0;
    updates.last_error = null;
    updates.last_error_at = null;
  } else {
    // Increment error count on failure
    // @ts-ignore - Database types need to be regenerated
    const { data } = await supabase
      .from('task_integrations')
      .select('sync_errors')
      .eq('id', integrationId)
      .single();

    const currentErrors = (data as any)?.sync_errors || 0;
    updates.sync_errors = currentErrors + 1;
    updates.last_error = result.errors[0]?.message || 'Unknown error';
    updates.last_error_at = new Date().toISOString();
  }

  // @ts-ignore - Database types need to be regenerated
  const updateResult = await supabase.from('task_integrations').update(updates).eq('id', integrationId);
}

/**
 * Process an incoming webhook
 */
export async function processWebhook(
  params: ProcessWebhookParams
): Promise<ProcessWebhookResult> {
  const { provider, signature, timestamp, rawBody, payload } = params;

  try {
    // Get the adapter for this provider
    const adapter = getAdapter(provider);

    // Get integration config from database
    const config = await getIntegrationConfig(provider);

    // Verify webhook signature if present
    if (signature && config.webhookSecret) {
      const webhookPayload: WebhookPayload = {
        provider,
        signature,
        timestamp,
        eventType: '', // Will be populated by adapter
        data: payload as Record<string, unknown>,
      };

      const isValid = adapter.validateWebhook(webhookPayload, config.webhookSecret);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid webhook signature',
          statusCode: 401,
        };
      }
    }

    // Process the webhook with the adapter
    const webhookPayload: WebhookPayload = {
      provider,
      signature,
      timestamp,
      eventType: extractEventType(provider, payload),
      data: payload as Record<string, unknown>,
    };

    const result = await adapter.processWebhook(webhookPayload, config);

    // Update integration status
    await updateIntegrationStatus(config.id, result);

    if (!result.success) {
      return {
        success: false,
        error: result.errors[0]?.message || 'Webhook processing failed',
        statusCode: 500,
      };
    }

    return {
      success: true,
      tasksCreated: result.tasksCreated,
      tasksUpdated: result.tasksUpdated,
      tasksDeleted: result.tasksDeleted,
    };
  } catch (error) {
    console.error('Error processing webhook:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
    };
  }
}

/**
 * Extract event type from payload based on provider
 */
function extractEventType(provider: IntegrationProvider, payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'unknown';
  }

  const data = payload as Record<string, unknown>;

  switch (provider) {
    case 'todoist':
      return (data.event_name as string) || 'unknown';
    case 'asana':
      return 'events'; // Asana sends multiple events in one payload
    case 'clickup':
      return (data.event as string) || 'unknown';
    default:
      return 'unknown';
  }
}
