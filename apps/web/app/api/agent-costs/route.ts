import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@orqestr/database';

type AgentCostInsert = Database['public']['Tables']['agent_costs']['Insert'];

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

// GET /api/agent-costs - Get agent costs (for dashboard/reporting)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // User auth for viewing costs
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('agent_costs')
      .select('*, agents(name, type)')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    // Apply filters
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data: costs, error } = await query;

    if (error) {
      console.error('Error fetching agent costs:', error);
      return NextResponse.json({ error: 'Failed to fetch agent costs' }, { status: 500 });
    }

    // Calculate totals
    const totalCost = costs?.reduce((sum: number, cost: any) => sum + cost.cost_usd, 0) || 0;
    const totalInputTokens = costs?.reduce((sum: number, cost: any) => sum + cost.input_tokens, 0) || 0;
    const totalOutputTokens = costs?.reduce((sum: number, cost: any) => sum + cost.output_tokens, 0) || 0;

    return NextResponse.json({
      costs,
      summary: {
        total_cost_usd: totalCost,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        count: costs?.length || 0,
      }
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/agent-costs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent-costs - Log agent cost/token usage
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
    if (!body.model || typeof body.model !== 'string') {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }
    if (typeof body.input_tokens !== 'number' || body.input_tokens < 0) {
      return NextResponse.json({ error: 'Valid input_tokens is required' }, { status: 400 });
    }
    if (typeof body.output_tokens !== 'number' || body.output_tokens < 0) {
      return NextResponse.json({ error: 'Valid output_tokens is required' }, { status: 400 });
    }
    if (typeof body.cost_usd !== 'number' || body.cost_usd < 0) {
      return NextResponse.json({ error: 'Valid cost_usd is required' }, { status: 400 });
    }

    // Prepare cost data
    const costData: AgentCostInsert = {
      agent_id: agent.id,
      agent_task_id: body.agent_task_id || null,
      user_id: agent.user_id,
      model: body.model.trim(),
      input_tokens: body.input_tokens,
      output_tokens: body.output_tokens,
      cost_usd: body.cost_usd,
      timestamp: new Date().toISOString(),
      metadata: body.metadata || null,
    };

    const { data: cost, error } = await supabase
      .from('agent_costs')
      // @ts-ignore - Supabase type inference issue
      .insert(costData)
      .select()
      .single();

    if (error) {
      console.error('Error logging agent cost:', error);
      return NextResponse.json({ error: 'Failed to log cost' }, { status: 500 });
    }

    return NextResponse.json({ cost }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/agent-costs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
