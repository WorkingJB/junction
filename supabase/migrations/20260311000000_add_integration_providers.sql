-- Add new integration providers and webhook support
-- Migration for expanding task integration capabilities

-- Add new integration providers to the enum
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'clickup';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'monday';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'google_tasks';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'microsoft_planner';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'basecamp';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'ticktick';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'microsoft_project';

-- Add webhook and polling-related columns to task_integrations table
ALTER TABLE public.task_integrations
ADD COLUMN IF NOT EXISTS webhook_id TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS requires_polling BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS polling_interval_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS last_poll_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_errors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Create index for polling scheduler
CREATE INDEX IF NOT EXISTS idx_task_integrations_polling
  ON public.task_integrations(requires_polling, last_poll_at)
  WHERE requires_polling = TRUE AND sync_enabled = TRUE;

-- Create index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_task_integrations_webhook_id
  ON public.task_integrations(webhook_id)
  WHERE webhook_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.task_integrations.webhook_id IS 'External webhook ID from the provider';
COMMENT ON COLUMN public.task_integrations.webhook_secret IS 'Secret for validating webhook signatures (encrypted)';
COMMENT ON COLUMN public.task_integrations.webhook_url IS 'URL registered with the provider for receiving webhooks';
COMMENT ON COLUMN public.task_integrations.requires_polling IS 'Whether this integration requires polling instead of webhooks';
COMMENT ON COLUMN public.task_integrations.polling_interval_minutes IS 'How often to poll for changes (in minutes)';
COMMENT ON COLUMN public.task_integrations.last_poll_at IS 'Timestamp of last successful poll';
COMMENT ON COLUMN public.task_integrations.sync_errors IS 'Count of consecutive sync errors';
COMMENT ON COLUMN public.task_integrations.last_error IS 'Last error message encountered during sync';
COMMENT ON COLUMN public.task_integrations.last_error_at IS 'Timestamp of last sync error';
