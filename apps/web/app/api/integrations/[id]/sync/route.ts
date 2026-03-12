/**
 * API route for manually triggering integration sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  TodoistAdapter,
  AsanaAdapter,
  ClickUpAdapter,
  type IntegrationProvider,
  ConflictResolution,
} from '@junction/integrations';
import { syncTasksWithProvider } from '@/app/services/task-sync-service';

/**
 * POST /api/integrations/[id]/sync
 * Manually trigger a sync for an integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the integration
    // @ts-ignore - Database types need to be regenerated
    const { data: integrationData, error: fetchError } = await supabase
      .from('task_integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !integrationData) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const integration = integrationData as any;

    if (!integration.sync_enabled) {
      return NextResponse.json(
        { error: 'Integration sync is disabled' },
        { status: 400 }
      );
    }

    // Get adapter for provider
    const adapter = getAdapter(integration.provider);

    // Build integration config
    const config = {
      id: integration.id,
      userId: integration.user_id,
      provider: integration.provider,
      tokens: {
        accessToken: integration.access_token,
        refreshToken: integration.refresh_token || undefined,
        expiresAt: integration.token_expires_at
          ? new Date(integration.token_expires_at)
          : undefined,
      },
      syncEnabled: integration.sync_enabled,
      webhookId: integration.webhook_id || undefined,
      webhookSecret: integration.webhook_secret || undefined,
      webhookUrl: integration.webhook_url || undefined,
      requiresPolling: integration.requires_polling || false,
      pollingIntervalMinutes: integration.polling_interval_minutes || undefined,
      lastSyncAt: integration.last_sync ? new Date(integration.last_sync) : undefined,
      metadata: (integration.metadata as Record<string, unknown>) || {},
    };

    // Trigger sync
    const result = await syncTasksWithProvider(
      adapter,
      config,
      ConflictResolution.LAST_WRITE_WINS
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Sync failed',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tasksCreated: result.tasksCreated,
      tasksUpdated: result.tasksUpdated,
      tasksDeleted: result.tasksDeleted,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error syncing integration:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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
