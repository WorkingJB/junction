import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@orqestr/database';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

// GET /api/tasks - List all tasks for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as Task['status'] | null;
    const type = searchParams.get('type') as Task['type'] | null;
    const priority = searchParams.get('priority') as Task['priority'] | null;
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: tasks, error } = await query;

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
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Prepare task data
    const taskData: TaskInsert = {
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

    const { data: task, error } = await supabase
      .from('tasks')
      // @ts-ignore - Supabase type inference issue
      .insert(taskData)
      .select()
      .single();

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
