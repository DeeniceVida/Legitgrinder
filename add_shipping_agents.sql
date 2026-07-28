-- ============================================================================
--  Shipping agent tags
--  Run once in the Supabase SQL editor. Safe to re-run.
--
--  You define your agents once (name + colour), then tag each order with the
--  agent it shipped with, so you can see and filter what went with whom.
-- ============================================================================

create table if not exists public.shipping_agents (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default 'slate',   -- rose | amber | emerald | teal | violet | slate
  created_at timestamptz not null default now()
);

create unique index if not exists shipping_agents_name_uniq
  on public.shipping_agents (lower(name));

alter table public.shipping_agents enable row level security;

-- Admin-only: agents are internal operational data, never public.
drop policy if exists "admin manages shipping agents" on public.shipping_agents;
create policy "admin manages shipping agents" on public.shipping_agents
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- The tag itself lives on the order, stored by name so it survives an agent
-- being renamed or removed.
alter table public.invoices
  add column if not exists shipping_agent text;

create index if not exists invoices_shipping_agent_idx
  on public.invoices (shipping_agent) where shipping_agent is not null;
