import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/[id]/heartbeat - Agent heartbeat (keep-alive)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // For heartbeat, we allow API key authentication instead of user auth
    // This way agents can send heartbeats without the user being logged in
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const { id } = await params;

    // Verify the API key matches this agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid agent or API key' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Update last_heartbeat and optionally status
    const updateData: any = {
      last_heartbeat: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Allow agent to update its own status
    if (body.status) {
      updateData.status = body.status;
    }

    // If no status provided but agent is offline, set to idle
    if (!body.status && (agent as any).status === 'offline') {
      updateData.status = 'idle';
    }

    const { data: updatedAgent, error } = await supabase
      .from('agents')
      // @ts-ignore - Supabase type inference issue
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

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
