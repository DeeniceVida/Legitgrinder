-- ============================================================================
--  Riders — the two or three people who actually carry deliveries.
--
--  Their phone numbers are personal data, so this is admin-only: there is no
--  public read policy. The delivery estimator on the site needs the fee rules,
--  not the roster, so nothing on the public page reads this table.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

create table if not exists public.riders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  /** The one used unless someone says otherwise. */
  is_default  boolean not null default false,
  /** A rider who has left is deactivated, never deleted — old jobs still name them. */
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists riders_active_idx on public.riders (active, name);

-- Only ever one default. Enforced here rather than in the app so two admin
-- tabs open at once cannot both set one.
create unique index if not exists riders_single_default_idx
  on public.riders (is_default) where is_default;

alter table public.riders enable row level security;

drop policy if exists "admin manages riders" on public.riders;
create policy "admin manages riders" on public.riders
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
