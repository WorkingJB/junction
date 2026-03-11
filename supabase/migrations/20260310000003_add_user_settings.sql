-- User Settings Table
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  
  -- Appearance Settings
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  compact_mode boolean default false,
  sidebar_collapsed boolean default false,
  
  -- Task Settings
  default_task_priority text default 'medium' check (default_task_priority in ('low', 'medium', 'high', 'urgent')),
  default_task_type text default 'work' check (default_task_type in ('work', 'personal')),
  task_notifications_enabled boolean default true,
  task_email_digest text default 'daily' check (task_email_digest in ('none', 'daily', 'weekly')),
  
  -- Agent Settings
  agent_notifications_enabled boolean default true,
  agent_auto_approve_tasks boolean default false,
  agent_cost_alerts_enabled boolean default true,
  agent_cost_alert_threshold numeric(10, 2) default 10.00,
  
  -- Integration Settings
  integration_settings jsonb default '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- RLS Policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- Create settings for existing users
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Function to auto-create settings for new users
create or replace function public.create_user_settings()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create settings on user signup
drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.create_user_settings();

-- Updated at trigger
create or replace function public.update_user_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_user_settings_updated_at on public.user_settings;
create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.update_user_settings_updated_at();
