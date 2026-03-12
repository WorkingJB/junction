import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@orqestr/database';

type AgentTask = Database['public']['Tables']['agent_tasks']['Row'];
type AgentTaskInsert = Database['public']['Tables']['agent_tasks']['Insert'];

// Helper to authenticate via API key
async function authenticateAgent(request: NextRequest, supabase: any) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid API key', status: 401 };
  }

  const apiKey = authHeader.replace('Bearer ', '');

  // Find agent by API key
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, user_id')
    .eq('api_key', apiKey)
    .single();

  if (error || !agent) {
    return { error: 'Invalid API key', status: 401 };
  }

  return { agent };
}

// GET /api/agent-tasks - List agent tasks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Try user auth first (for dashboard viewing)
    const { data: { user } } = await supabase.auth.getUser();

    let userId: string;

    if (user) {
      // User is viewing their own agent tasks
      userId = user.id;
    } else {
      // Agent is viewing its own tasks
      const authResult = await authenticateAgent(request, supabase);
      if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
      userId = authResult.agent.user_id;
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as AgentTask['status'] | null;
    const agentId = searchParams.get('agent_id');

    // Build query
    let query = supabase
      .from('agent_tasks')
      .select('*, agents(name, type, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching agent tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch agent tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Unexpected error in GET /api/agent-tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent-tasks - Create a new agent task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate via API key
    const authResult = await authenticateAgent(request, supabase);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { agent } = authResult;
    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    // Prepare task data
    const taskData: AgentTaskInsert = {
      agent_id: agent.id,
      user_id: agent.user_id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      started_at: body.status === 'in_progress' ? new Date().toISOString() : null,
      completed_at: null,
      error_message: null,
      metadata: body.metadata || null,
    };

    const { data: task, error } = await supabase
      .from('agent_tasks')
      // @ts-ignore - Supabase type inference issue
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Error creating agent task:', error);
      return NextResponse.json({ error: 'Failed to create agent task' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/agent-tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
