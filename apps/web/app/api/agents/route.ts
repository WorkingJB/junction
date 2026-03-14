import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';
import type { AgentStatus } from '@orqestr/database';
import { randomBytes } from 'crypto';

// Generate a secure API key
function generateApiKey(): string {
  // Format: jnct_<32 random hex characters>
  const randomHex = randomBytes(32).toString('hex');
  return `jnct_${randomHex}`;
}

// GET /api/agents - List all agents for the current user
export async function GET(request: NextRequest) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as AgentStatus | null;
    const type = searchParams.get('type');

    // Get repositories and fetch agents
    const repos = await createRepositories();
    const { data: agents, error } = await repos.agents.getMany({
      userId: user.id,
      status: status || undefined,
      type: type || undefined,
    });

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents - Register a new agent
export async function POST(request: NextRequest) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    // Generate API key
    const apiKey = generateApiKey();

    // Prepare agent data
    const agentData = {
      user_id: user.id,
      name: body.name.trim(),
      type: body.type.trim(),
      status: 'offline' as const, // New agents start as offline
      api_key: apiKey,
      last_heartbeat: null,
      metadata: body.metadata || null,
    };

    // Create agent using repository
    const repos = await createRepositories();
    const { data: agent, error } = await repos.agents.create(agentData);

    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
