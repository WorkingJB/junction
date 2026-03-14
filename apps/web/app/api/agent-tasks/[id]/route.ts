import { NextRequest, NextResponse } from 'next/server';
import { createRepositories } from '@orqestr/database';

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

// PATCH /api/agent-tasks/[id] - Update an agent task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate via API key
    const authResult = await authenticateAgent(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { agent } = authResult;
    const { id } = await params;
    const body = await request.json();

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;

    if (body.status !== undefined) {
      updateData.status = body.status;

      // Auto-set timestamps based on status (also handled by DB trigger)
      if (body.status === 'in_progress' && !body.started_at) {
        updateData.started_at = new Date().toISOString();
      } else if (body.status === 'completed' || body.status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.error_message !== undefined) updateData.error_message = body.error_message;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Update task using repository (ensure it belongs to this agent)
    const repos = await createRepositories();
    const { data: task, error } = await repos.agentTasks.update(id, agent.user_id, updateData);

    if (error) {
      console.error('Error updating agent task:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    // Verify task belongs to this agent
    if (task && task.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/agent-tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/agent-tasks/[id] - Delete an agent task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate via API key
    const authResult = await authenticateAgent(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { agent } = authResult;
    const { id } = await params;

    // First verify task belongs to this agent
    const repos = await createRepositories();
    const { data: task } = await repos.agentTasks.getById(id, agent.user_id);

    if (!task || task.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete task using repository
    const { error } = await repos.agentTasks.delete(id, agent.user_id);

    if (error) {
      console.error('Error deleting agent task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/agent-tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
