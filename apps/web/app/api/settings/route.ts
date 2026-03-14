import { NextResponse } from 'next/server';
import { createServerAuthService, createRepositories } from '@orqestr/database';

// GET /api/settings - Get user settings
export async function GET() {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get settings using repository (automatically creates if none exist)
    const repos = await createRepositories();
    const { data: settings, error } = await repos.settings.getByUserId(user.id);

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Unexpected error in GET /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: Request) {
  try {
    // Get auth service and check authentication
    const authService = await createServerAuthService();
    const { data: user, error: authError } = await authService.getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate theme if provided
    if (body.theme && !['light', 'dark', 'system'].includes(body.theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }

    // Validate task priority if provided
    if (body.default_task_priority && !['low', 'medium', 'high', 'urgent'].includes(body.default_task_priority)) {
      return NextResponse.json({ error: 'Invalid default task priority' }, { status: 400 });
    }

    // Validate task type if provided
    if (body.default_task_type && !['work', 'personal'].includes(body.default_task_type)) {
      return NextResponse.json({ error: 'Invalid default task type' }, { status: 400 });
    }

    // Validate email digest if provided
    if (body.task_email_digest && !['none', 'daily', 'weekly'].includes(body.task_email_digest)) {
      return NextResponse.json({ error: 'Invalid email digest frequency' }, { status: 400 });
    }

    // Build update object (only include provided fields)
    const updateData: any = {};
    const allowedFields = [
      'theme',
      'compact_mode',
      'sidebar_collapsed',
      'default_task_priority',
      'default_task_type',
      'task_notifications_enabled',
      'task_email_digest',
      'agent_notifications_enabled',
      'agent_auto_approve_tasks',
      'agent_cost_alerts_enabled',
      'agent_cost_alert_threshold',
      'integration_settings',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Update settings using repository
    const repos = await createRepositories();
    const { data: updatedSettings, error } = await repos.settings.update(user.id, updateData);

    if (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
