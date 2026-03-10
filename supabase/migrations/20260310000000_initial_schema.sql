-- Junction Initial Schema Migration
-- Creates all tables for task management and agent tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_type AS ENUM ('work', 'personal');
CREATE TYPE agent_status AS ENUM ('active', 'idle', 'waiting_for_input', 'offline', 'error');
CREATE TYPE agent_task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'waiting_for_input');
CREATE TYPE agent_task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE integration_provider AS ENUM ('todoist', 'microsoft_todo', 'asana', 'linear', 'jira');

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TASKS TABLE (Human tasks)
-- ============================================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 500),
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  type task_type NOT NULL DEFAULT 'personal',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  integration_id UUID,
  external_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 200),
  type TEXT NOT NULL,
  status agent_status NOT NULL DEFAULT 'offline',
  api_key TEXT NOT NULL UNIQUE,
  last_heartbeat TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AGENT_TASKS TABLE
-- ============================================================================
CREATE TABLE public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 500),
  description TEXT,
  status agent_task_status NOT NULL DEFAULT 'pending',
  priority agent_task_priority NOT NULL DEFAULT 'medium',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AGENT_COSTS TABLE
-- ============================================================================
CREATE TABLE public.agent_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  agent_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
  cost_usd DECIMAL(10, 6) NOT NULL CHECK (cost_usd >= 0),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- ============================================================================
-- TASK_INTEGRATIONS TABLE
-- ============================================================================
CREATE TABLE public.task_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON public.users(email);

-- Tasks
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_type ON public.tasks(type);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_integration_id ON public.tasks(integration_id) WHERE integration_id IS NOT NULL;
CREATE INDEX idx_tasks_external_id ON public.tasks(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

-- Agents
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_api_key ON public.agents(api_key);
CREATE INDEX idx_agents_last_heartbeat ON public.agents(last_heartbeat DESC);

-- Agent Tasks
CREATE INDEX idx_agent_tasks_agent_id ON public.agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_user_id ON public.agent_tasks(user_id);
CREATE INDEX idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX idx_agent_tasks_created_at ON public.agent_tasks(created_at DESC);

-- Agent Costs
CREATE INDEX idx_agent_costs_agent_id ON public.agent_costs(agent_id);
CREATE INDEX idx_agent_costs_user_id ON public.agent_costs(user_id);
CREATE INDEX idx_agent_costs_task_id ON public.agent_costs(agent_task_id) WHERE agent_task_id IS NOT NULL;
CREATE INDEX idx_agent_costs_timestamp ON public.agent_costs(timestamp DESC);

-- Task Integrations
CREATE INDEX idx_task_integrations_user_id ON public.task_integrations(user_id);
CREATE INDEX idx_task_integrations_provider ON public.task_integrations(provider);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_agent_id ON public.audit_logs(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_integrations_updated_at
  BEFORE UPDATE ON public.task_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own user data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own user data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Agents policies
CREATE POLICY "Users can view their own agents"
  ON public.agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON public.agents FOR DELETE
  USING (auth.uid() = user_id);

-- Agent Tasks policies
CREATE POLICY "Users can view their own agent tasks"
  ON public.agent_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create agent tasks"
  ON public.agent_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent tasks"
  ON public.agent_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent tasks"
  ON public.agent_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Agent Costs policies
CREATE POLICY "Users can view their own agent costs"
  ON public.agent_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create agent costs"
  ON public.agent_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Task Integrations policies
CREATE POLICY "Users can view their own integrations"
  ON public.task_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
  ON public.task_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.task_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON public.task_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Audit Logs policies (read-only for users, insert allowed for system)
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id OR (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically create user record on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically set completed_at when task status changes to completed
CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_completed_at();

-- Same for agent tasks
CREATE OR REPLACE FUNCTION public.set_agent_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    NEW.started_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agent_task_timestamps_trigger
  BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_agent_task_completed_at();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- No initial data needed for MVP

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'Extended user profile data linked to Supabase auth.users';
COMMENT ON TABLE public.tasks IS 'Human-created tasks (native and synced from integrations)';
COMMENT ON TABLE public.agents IS 'AI agents registered with Junction';
COMMENT ON TABLE public.agent_tasks IS 'Tasks created and managed by AI agents';
COMMENT ON TABLE public.agent_costs IS 'Token usage and cost tracking for agent operations';
COMMENT ON TABLE public.task_integrations IS 'OAuth tokens and metadata for external task service integrations';
COMMENT ON TABLE public.audit_logs IS 'Audit trail of all actions performed by users and agents';
