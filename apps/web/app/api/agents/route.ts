import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@junction/database';
import { randomBytes } from 'crypto';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentInsert = Database['public']['Tables']['agents']['Insert'];

// Generate a secure API key
function generateApiKey(): string {
  // Format: jnct_<32 random hex characters>
  const randomHex = randomBytes(32).toString('hex');
  return `jnct_${randomHex}`;
}

// GET /api/agents - List all agents for the current user
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
    const status = searchParams.get('status') as Agent['status'] | null;
    const type = searchParams.get('type');

    // Build query
    let query = supabase
      .from('agents')
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

    const { data: agents, error } = await query;

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Unexpected error in GET /api/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents - Register a new agent
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
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    // Generate API key
    const apiKey = generateApiKey();

    // Prepare agent data
    const agentData: AgentInsert = {
      user_id: user.id,
      name: body.name.trim(),
      type: body.type.trim(),
      status: 'offline', // New agents start as offline
      api_key: apiKey,
      last_heartbeat: null,
      metadata: body.metadata || null,
    };

    const { data: agent, error } = await supabase
      .from('agents')
      // @ts-ignore - Supabase type inference issue
      .insert(agentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
