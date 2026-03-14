import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';

// PATCH /api/tasks/[id] - Update a task
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
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Auto-set completed_at when status changes to completed
      // Note: This is also handled by database trigger, but we set it here for consistency
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (body.status !== 'completed') {
        updateData.completed_at = null;
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.due_date !== undefined) updateData.due_date = body.due_date || null;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Update task using repository
    const repos = await createRepositories();
    const { data: task, error } = await repos.tasks.update(id, user.id, updateData);

    if (error) {
      console.error('Error updating task:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete a task
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

    // Delete task using repository
    const repos = await createRepositories();
    const { error } = await repos.tasks.delete(id, user.id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
