-- Private error logging table for server-side detailed errors
-- Run this in Supabase SQL editor or psql connection

create table if not exists public.error_logs (
  id bigserial primary key,
  source text not null,
  message text not null,
  name text,
  stack text,
  status_code int,
  request_id text,
  meta jsonb,
  created_at timestamptz default now()
);

-- Enable RLS; service_role bypasses RLS by default.
alter table public.error_logs enable row level security;

-- Optional policies for read via service role only (documented; service role bypasses anyway)
drop policy if exists error_logs_select on public.error_logs;
drop policy if exists error_logs_insert on public.error_logs;

create policy error_logs_select on public.error_logs for select using (auth.role() = 'service_role');
create policy error_logs_insert on public.error_logs for insert with check (auth.role() = 'service_role');