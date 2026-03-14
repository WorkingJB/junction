import { NextRequest, NextResponse } from 'next/server';
import { createRepositories } from '@orqestr/database';

// POST /api/agents/[id]/heartbeat - Agent heartbeat (keep-alive)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // For heartbeat, we allow API key authentication instead of user auth
    // This way agents can send heartbeats without the user being logged in
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const { id } = await params;

    // Get repositories
    const repos = await createRepositories();

    // Verify the API key matches this agent
    const { data: agent, error: agentError } = await repos.agents.getByApiKey(apiKey);

    if (agentError || !agent || agent.id !== id) {
      return NextResponse.json({ error: 'Invalid agent or API key' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Prepare update data
    const updateData: any = {};

    // Allow agent to update its own status
    if (body.status) {
      updateData.status = body.status;
    }

    // If no status provided but agent is offline, set to idle
    if (!body.status && agent.status === 'offline') {
      updateData.status = 'idle';
    }

    // Update heartbeat using repository (which updates last_heartbeat automatically)
    const { data: updatedAgent, error } = updateData.status
      ? await repos.agents.update(id, agent.user_id, updateData)
      : await repos.agents.updateHeartbeat(id, agent.user_id);

    if (error) {
      console.error('Error updating heartbeat:', error);
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/agents/[id]/heartbeat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
