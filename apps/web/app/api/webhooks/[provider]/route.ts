/**
 * Webhook receiver endpoint for integration providers
 * Handles incoming webhooks from Todoist, Asana, ClickUp, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWebhook } from '../../../services/webhook-processor';
import type { IntegrationProvider } from '@junction/integrations';
import { checkRateLimit, getRateLimitHeaders, RateLimits } from '@/lib/rate-limiter';
import { handleApiError, ValidationError, RateLimitError } from '@/lib/api-error-handler';

/**
 * POST handler for webhook events
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam.toLowerCase() as IntegrationProvider;

    // Rate limiting per provider
    const rateLimitResult = checkRateLimit({
      identifier: `webhook:${provider}`,
      ...RateLimits.WEBHOOK,
    });

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(
        'Webhook rate limit exceeded',
        rateLimitResult.retryAfter
      );
    }

    // Validate provider
    const validProviders: IntegrationProvider[] = [
      'todoist',
      'asana',
      'clickup',
      'ticktick',
      'google_tasks',
      'microsoft_planner',
      'microsoft_project',
      'basecamp',
      'monday',
    ];

    if (!validProviders.includes(provider)) {
      throw new ValidationError('Invalid provider');
    }

    // Get signature from headers (different providers use different header names)
    const signature =
      request.headers.get('x-todoist-hmac-sha256') ||
      request.headers.get('x-hook-signature') ||
      request.headers.get('x-signature') ||
      null;

    // Get timestamp for replay attack prevention
    const timestamp = request.headers.get('x-hook-timestamp') || undefined;

    // Get request body
    const rawBody = await request.text();
    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Invalid JSON payload');
    }

    // Process the webhook
    const result = await processWebhook({
      provider,
      signature,
      timestamp,
      rawBody,
      payload,
    });

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Webhook processing failed' },
        { status: result.statusCode || 500 }
      );
    }

    // Return success response with rate limit headers
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed successfully',
        tasksCreated: result.tasksCreated,
        tasksUpdated: result.tasksUpdated,
        tasksDeleted: result.tasksDeleted,
      },
      {
        status: 200,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET handler for webhook verification (used by some providers)
 * Some providers like Asana send a GET request to verify the webhook URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam.toLowerCase();

    // Handle Asana webhook verification
    if (provider === 'asana') {
      const hookSecret = request.nextUrl.searchParams.get('hook_secret');

      if (hookSecret) {
        // Asana requires echoing back the hook_secret with X-Hook-Secret header
        return new NextResponse(null, {
          status: 200,
          headers: {
            'X-Hook-Secret': hookSecret,
          },
        });
      }
    }

    return NextResponse.json(
      { message: 'Webhook endpoint active' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
