-- Add OAuth states table for CSRF protection
-- Migration for OAuth state management

-- Create oauth_states table
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  state TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT oauth_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for state lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state
  ON public.oauth_states(state);

-- Create index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at
  ON public.oauth_states(expires_at);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own OAuth states"
  ON public.oauth_states
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OAuth states"
  ON public.oauth_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth states"
  ON public.oauth_states
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.oauth_states IS 'OAuth state parameters for CSRF protection';
COMMENT ON COLUMN public.oauth_states.state IS 'Random state parameter for OAuth CSRF protection';
COMMENT ON COLUMN public.oauth_states.expires_at IS 'When this state parameter expires (typically 10 minutes)';
