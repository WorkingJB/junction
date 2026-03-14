import { NextRequest, NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';
import type { TaskStatus, TaskType, TaskPriority } from '@orqestr/database';

// GET /api/tasks - List all tasks for the current user
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
    const status = searchParams.get('status') as TaskStatus | null;
    const type = searchParams.get('type') as TaskType | null;
    const priority = searchParams.get('priority') as TaskPriority | null;
    const search = searchParams.get('search');

    // Get repositories
    const repos = await createRepositories();

    // Fetch tasks using repository
    const { data: tasks, error } = await repos.tasks.getMany({
      userId: user.id,
      status: status || undefined,
      type: type || undefined,
      priority: priority || undefined,
      search: search || undefined,
    });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
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
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Prepare task data
    const taskData = {
      user_id: user.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      type: body.type || 'personal',
      due_date: body.due_date || null,
      completed_at: null,
      integration_id: null,
      external_id: null,
      metadata: body.metadata || null,
    };

    // Get repositories and create task
    const repos = await createRepositories();
    const { data: task, error } = await repos.tasks.create(taskData);

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
