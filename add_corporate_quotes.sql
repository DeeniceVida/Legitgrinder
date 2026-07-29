-- ============================================================================
--  /corporate — B2B bulk procurement quote requests
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- ── What you're willing to source, and its landed price band ────────────────
-- You manage these from the Corporate tab. The public estimator only appears
-- for categories marked active WITH a price band — so a category you haven't
-- priced yet can still be requested, it just won't show a false estimate.
create table if not exists public.corporate_categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  blurb        text,                       -- e.g. "Hbada & high-end series"
  min_kes      numeric,                    -- indicative landed cost per unit, low
  max_kes      numeric,                    -- indicative landed cost per unit, high
  moq          int default 5,              -- minimum order quantity for this line
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.corporate_categories enable row level security;

-- Anyone can read the catalogue (the page needs it); only admin can change it.
drop policy if exists "public reads corporate categories" on public.corporate_categories;
create policy "public reads corporate categories" on public.corporate_categories
  for select using (true);

drop policy if exists "admin manages corporate categories" on public.corporate_categories;
create policy "admin manages corporate categories" on public.corporate_categories
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- ── The quote requests themselves ───────────────────────────────────────────
create table if not exists public.corporate_quotes (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  business_name  text not null,
  email          text not null,
  whatsapp       text,
  location       text,
  categories     text[],                   -- category names they selected
  quantity_band  text,                     -- '5-10' | '10-25' | '25-50' | '50+'
  budget_band    text,
  timeline       text,                     -- 'immediate' | '30days' | '1-3months' | 'researching'
  notes          text,
  estimate_low   numeric,                  -- the indicative range we showed them
  estimate_high  numeric,
  lead_quality   text default 'priority',  -- 'priority' | 'low'  (researchers/small = low)
  status         text not null default 'new',   -- new | quoted | won | lost
  admin_notes    text,
  created_at     timestamptz not null default now()
);

alter table public.corporate_quotes enable row level security;

-- Businesses submit; only you can read them back.
drop policy if exists "anyone submits a corporate quote" on public.corporate_quotes;
create policy "anyone submits a corporate quote" on public.corporate_quotes
  for insert with check (true);

drop policy if exists "admin manages corporate quotes" on public.corporate_quotes;
create policy "admin manages corporate quotes" on public.corporate_quotes
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create index if not exists corporate_quotes_status_idx on public.corporate_quotes (status, created_at desc);


-- ── Starter catalogue ───────────────────────────────────────────────────────
-- Price bands are intentionally left NULL: fill them in from the Corporate tab
-- so the estimator never shows a number you haven't approved.
insert into public.corporate_categories (name, blurb, moq, sort_order)
select * from (values
  ('Ergonomic Chairs',                  'Hbada & high-end series',                5, 1),
  ('Motorized Standing Desks',          'Executive tables & sit-stand frames',    5, 2),
  ('Monitors & Display Solutions',      'High-resolution business displays',      5, 3),
  ('Other Commercial Equipment',        'Quoted manually — no instant estimate', 10, 4)
) as v(name, blurb, moq, sort_order)
where not exists (select 1 from public.corporate_categories);
