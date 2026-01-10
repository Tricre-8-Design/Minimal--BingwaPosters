-- System Maintenance Settings Database Schema
-- Allows admin control over Placid and AI poster generation engines

-- Create system_settings table
create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}',
  description text,
  updated_at timestamp with time zone default now(),
  updated_by text, -- Admin email or identifier
  created_at timestamp with time zone default now()
);

-- Insert default maintenance settings for both engines
insert into system_settings (setting_key, setting_value, description) values
(
  'maintenance_placid',
  '{"enabled": false, "message": "Placid poster generation is temporarily unavailable for maintenance. Please try again later."}'::jsonb,
  'Maintenance mode for Placid poster engine'
),
(
  'maintenance_ai',
  '{"enabled": false, "message": "AI poster generation is temporarily unavailable for maintenance. Please try again later."}'::jsonb,
  'Maintenance mode for AI poster engine'
)
on conflict (setting_key) do nothing;

-- Create index for faster lookups
create index if not exists idx_system_settings_key on system_settings(setting_key);

-- Add updated_at trigger
create or replace function update_system_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger system_settings_updated_at
  before update on system_settings
  for each row
  execute function update_system_settings_timestamp();
