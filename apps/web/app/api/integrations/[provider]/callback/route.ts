/**
 * OAuth callback endpoint
 * Handles the OAuth callback from integration providers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TodoistAdapter,
  AsanaAdapter,
  ClickUpAdapter,
  type IntegrationProvider,
  validateState,
} from '@junction/integrations';
import { createClient } from '@/lib/supabase/server';

/**
 * GET handler for OAuth callback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toLowerCase() as IntegrationProvider;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=${error}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=missing_parameters`
      );
    }

    const supabase = await createClient();

    // Verify state to prevent CSRF
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', provider)
      .single();

    if (stateError || !stateData) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=invalid_state`
      );
    }

    // Check if state has expired
    if (new Date(stateData.expires_at) < new Date()) {
      await supabase.from('oauth_states').delete().eq('id', stateData.id);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=state_expired`
      );
    }

    // Delete used state
    await supabase.from('oauth_states').delete().eq('id', stateData.id);

    // Get adapter for provider
    const adapter = getAdapter(provider);

    // Get OAuth client credentials from environment
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=oauth_not_configured`
      );
    }

    // Exchange code for tokens
    const tokens = await adapter.exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });

    // Test connection
    const connectionValid = await adapter.testConnection({
      id: 'temp',
      userId: stateData.user_id,
      provider,
      tokens,
      syncEnabled: true,
      requiresPolling: adapter.requiresPolling,
    });

    if (!connectionValid) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=connection_failed`
      );
    }

    // Store integration in database
    const { error: insertError } = await supabase.from('task_integrations').insert({
      user_id: stateData.user_id,
      provider,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokens.expiresAt?.toISOString(),
      sync_enabled: true,
      requires_polling: adapter.requiresPolling,
      polling_interval_minutes: adapter.requiresPolling ? 15 : null,
    });

    if (insertError) {
      console.error('Failed to store integration:', insertError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=storage_failed`
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_success=${provider}`
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?integration_error=callback_failed`
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
