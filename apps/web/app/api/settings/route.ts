import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Database } from '@junction/database';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no settings exist, create default settings
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          // @ts-ignore - Supabase type inference issue
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating settings:', insertError);
          return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
        }

        return NextResponse.json({ settings: newSettings });
      }

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
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    const updateData: UserSettingsUpdate = {};
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
        (updateData as any)[field] = body[field];
      }
    }

    const { data: updatedSettings, error } = await supabase
      .from('user_settings')
      // @ts-ignore - Supabase type inference issue with dynamic partial updates
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

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
