/**
 * OAuth authorization endpoint
 * Initiates OAuth flow for integration providers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TodoistAdapter,
  AsanaAdapter,
  ClickUpAdapter,
  type IntegrationProvider,
  generateState,
} from '@junction/integrations';
import { createClient } from '@/lib/supabase/server';

/**
 * GET handler to initiate OAuth flow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam.toLowerCase() as IntegrationProvider;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get adapter for provider
    const adapter = getAdapter(provider);

    // Generate OAuth state for CSRF protection
    const state = generateState();

    // Store state in session/database for verification
    // @ts-ignore - Database types need to be regenerated
    await supabase.from('oauth_states').insert({
      user_id: user.id,
      provider,
      state,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    // Get OAuth client credentials from environment
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: `OAuth not configured for ${provider}` },
        { status: 500 }
      );
    }

    // Get authorization URL
    const authUrl = adapter.getAuthorizationUrl({
      clientId,
      redirectUri,
      state,
    });

    // Redirect to provider's OAuth page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
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
