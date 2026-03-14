/**
 * API route for managing integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';

/**
 * GET /api/integrations
 * List all integrations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's integrations using repository
    const repos = await createRepositories();
    const { data: integrations, error } = await repos.integrations.getMany({
      userId: user.id,
    });

    if (error) {
      console.error('Failed to fetch integrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    // Map to a safe response format (don't expose tokens)
    const safeIntegrations = integrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      syncEnabled: integration.sync_enabled,
      lastSync: integration.last_sync,
      syncErrors: integration.sync_errors || 0,
      lastError: integration.last_error,
      lastErrorAt: integration.last_error_at,
      webhookId: integration.webhook_id,
      requiresPolling: integration.requires_polling || false,
      pollingIntervalMinutes: integration.polling_interval_minutes,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    }));

    return NextResponse.json({
      integrations: safeIntegrations,
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
