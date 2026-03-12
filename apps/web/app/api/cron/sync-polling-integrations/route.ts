/**
 * Cron job endpoint for syncing polling-based integrations
 * This should be called periodically (e.g., every 5-15 minutes) by a scheduler like Vercel Cron
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-polling-integrations",
 *     "schedule": "*/15 * * * *"
 *   }]
 * }
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
 * GET /api/cron/sync-polling-integrations
 * Sync all polling-based integrations that are due for a sync
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch integrations that require polling and are due for a sync
    const now = new Date();
    const { data: integrations, error } = await supabase
      .from('task_integrations')
      .select('*')
      .eq('requires_polling', true)
      .eq('sync_enabled', true);

    if (error) {
      console.error('Failed to fetch polling integrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        message: 'No polling integrations found',
        synced: 0,
      });
    }

    const results = {
      total: integrations.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ integrationId: string; error: string }>,
    };

    // Process each integration
    for (const integration of integrations) {
      try {
        // Check if sync is due based on polling interval
        const pollingIntervalMs =
          (integration.polling_interval_minutes || 15) * 60 * 1000;
        const lastPollAt = integration.last_poll_at
          ? new Date(integration.last_poll_at)
          : new Date(0);

        const nextPollDue = new Date(lastPollAt.getTime() + pollingIntervalMs);

        if (now < nextPollDue) {
          results.skipped++;
          continue; // Not due yet
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
          lastSyncAt: integration.last_sync
            ? new Date(integration.last_sync)
            : undefined,
          metadata: (integration.metadata as Record<string, unknown>) || {},
        };

        // Sync tasks
        const result = await syncTasksWithProvider(
          adapter,
          config,
          ConflictResolution.LAST_WRITE_WINS
        );

        // Update last poll time
        await supabase
          .from('task_integrations')
          .update({
            last_poll_at: now.toISOString(),
            last_sync: now.toISOString(),
            sync_errors: result.success ? 0 : (integration.sync_errors || 0) + 1,
            last_error: result.success ? null : result.errors[0]?.message,
            last_error_at: result.success ? null : now.toISOString(),
          })
          .eq('id', integration.id);

        if (result.success) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push({
            integrationId: integration.id,
            error: result.errors[0]?.message || 'Unknown error',
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          integrationId: integration.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Polling sync completed',
      results,
    });
  } catch (error) {
    console.error('Error in polling sync cron:', error);
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
    // Add more adapters as they're implemented
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
