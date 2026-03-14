import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';

// GET /api/agents/[id] - Get a specific agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get agent using repository
    const repos = await createRepositories();
    const { data: agent, error } = await repos.agents.getById(id, user.id);

    if (error) {
      console.error('Error fetching agent:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/agents/[id] - Update an agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.type !== undefined) updateData.type = body.type.trim();
    if (body.status !== undefined) updateData.status = body.status;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Don't allow updating api_key through this endpoint for security
    // Don't allow updating user_id

    // Update agent using repository
    const repos = await createRepositories();
    const { data: agent, error } = await repos.agents.update(id, user.id, updateData);

    if (error) {
      console.error('Error updating agent:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/agents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete agent using repository
    // Note: In production, you might want to check for associated agent_tasks first
    const repos = await createRepositories();
    const { error } = await repos.agents.delete(id, user.id);

    if (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/agents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
