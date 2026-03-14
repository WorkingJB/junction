import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';
import type { AgentTaskStatus, AgentTask } from '@orqestr/database';

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

// GET /api/agent-tasks - List agent tasks
export async function GET(request: NextRequest) {
  try {
    let userId: string;

    // Try user auth first (for dashboard viewing)
    const authService = await createServerAuthService();
    const { data: user } = await authService.getCurrentUser();

    if (user) {
      // User is viewing their own agent tasks
      userId = user.id;
    } else {
      // Agent is viewing its own tasks
      const authResult = await authenticateAgent(request);
      if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
      userId = authResult.agent.user_id;
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as AgentTaskStatus | null;
    const agentId = searchParams.get('agent_id');

    // Get repositories and fetch tasks
    const repos = await createRepositories();
    const { data: tasksData, error } = await repos.agentTasks.getMany({
      userId,
      status: status || undefined,
      agentId: agentId || undefined,
    });

    if (error || !tasksData) {
      console.error('Error fetching agent tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch agent tasks' }, { status: 500 });
    }

    // Fetch agent details for each task
    const uniqueAgentIds = [...new Set(tasksData.map((t: AgentTask) => t.agent_id))];
    const agentDetailsMap = new Map();

    for (const agentId of uniqueAgentIds) {
      const { data: agent } = await repos.agents.getById(agentId, userId);
      if (agent) {
        agentDetailsMap.set(agentId, {
          name: agent.name,
          type: agent.type,
          status: agent.status,
        });
      }
    }

    // Enrich tasks with agent details
    const tasksWithAgents = tasksData.map((task: AgentTask) => ({
      ...task,
      agents: agentDetailsMap.get(task.agent_id) || null,
    }));

    return NextResponse.json({ tasks: tasksWithAgents });
  } catch (error) {
    console.error('Unexpected error in GET /api/agent-tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent-tasks - Create a new agent task
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
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    // Prepare task data
    const taskData = {
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

    // Create task using repository
    const repos = await createRepositories();
    const { data: task, error } = await repos.agentTasks.create(taskData);

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
