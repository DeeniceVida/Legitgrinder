-- Visitor tracking table (was never created — visit logging has failed silently since launch)
-- Run ONCE in Supabase Dashboard → SQL Editor.

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  path text,
  user_agent text,
  visited_at timestamptz not null default now()
);

alter table public.site_visits enable row level security;

-- Visitors (anon) may only INSERT — they can never read, change, or delete logs
create policy "anyone can log a visit"
  on public.site_visits for insert
  to anon, authenticated
  with check (true);

-- Only logged-in users (the admin dashboard) can read the count
create policy "authenticated can read visits"
  on public.site_visits for select
  to authenticated
  using (true);
