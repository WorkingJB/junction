import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';
import type { AgentCostInsert } from '@orqestr/database';

// Helper to authenticate agent via API key
async function authenticateAgent(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid API key', status: 401 };
  }

  const apiKey = authHeader.replace('Bearer ', '');

  // Use agents repository to authenticate
  const repos = await createRepositories();
  const { data: agent, error } = await repos.agents.getByApiKey(apiKey);

  if (error || !agent) {
    return { error: 'Invalid API key', status: 401 };
  }

  return { agent };
}

// GET /api/agent-costs - Get agent costs (for dashboard/reporting)
export async function GET(request: NextRequest) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id') || undefined;
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    // Get repositories and fetch costs with agent details
    const repos = await createRepositories();
    const { data: costs, error } = await repos.agentCosts.getManyWithAgents({
      userId: user.id,
      agentId,
      startDate,
      endDate,
    });

    if (error) {
      console.error('Error fetching agent costs:', error);
      return NextResponse.json({ error: 'Failed to fetch agent costs' }, { status: 500 });
    }

    // Get summary statistics
    const { data: summary } = await repos.agentCosts.getSummary({
      userId: user.id,
      agentId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      costs,
      summary,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/agent-costs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent-costs - Log agent cost/token usage
export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const authResult = await authenticateAgent(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { agent } = authResult;
    const body = await request.json();

    // Validate required fields
    if (!body.model || typeof body.model !== 'string') {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }
    if (typeof body.input_tokens !== 'number' || body.input_tokens < 0) {
      return NextResponse.json({ error: 'Valid input_tokens is required' }, { status: 400 });
    }
    if (typeof body.output_tokens !== 'number' || body.output_tokens < 0) {
      return NextResponse.json({ error: 'Valid output_tokens is required' }, { status: 400 });
    }
    if (typeof body.cost_usd !== 'number' || body.cost_usd < 0) {
      return NextResponse.json({ error: 'Valid cost_usd is required' }, { status: 400 });
    }

    // Prepare cost data
    const costData: AgentCostInsert = {
      agent_id: agent.id,
      agent_task_id: body.agent_task_id || null,
      user_id: agent.user_id,
      model: body.model.trim(),
      input_tokens: body.input_tokens,
      output_tokens: body.output_tokens,
      cost_usd: body.cost_usd,
      timestamp: new Date().toISOString(),
      metadata: body.metadata || null,
    };

    // Create cost entry using repository
    const repos = await createRepositories();
    const { data: cost, error } = await repos.agentCosts.create(costData);

    if (error) {
      console.error('Error logging agent cost:', error);
      return NextResponse.json({ error: 'Failed to log cost' }, { status: 500 });
    }

    return NextResponse.json({ cost }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/agent-costs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
