-- ============================================================================
--  MONITORS — BRING EVERYTHING UP TO DATE
--
--  Run this ONE file in the Supabase SQL editor. It is safe whatever you have
--  already run, and safe to run twice. It:
--
--    1. adds the two settings columns introduced after the first version
--    2. sets the agreed rates (rate 135, the $15 cut distributed)
--    3. fills in 40" and 49" freight
--    4. creates monitor_port_options with the factory's REAL per-size interface
--       upcharges (the old monitor_port_configs table had one flat figure)
--    5. adds colours: black and white everywhere, pink on the 23.8" 2K 100Hz
--
--  Requires add_monitor_catalog.sql to have been run first (it creates the
--  models). Ends with checks so you can see the result.
-- ============================================================================

-- ── 1. Columns added after the first version ────────────────────────────────
alter table public.monitor_settings add column if not exists freight_usd       numeric not null default 10;
alter table public.monitor_settings add column if not exists config_markup_kes numeric not null default 1900;

-- Service fee, worded exactly as the How It Works page already promises:
-- "From KES 3,000 … above KES 100,000 it becomes 4% of the buying price."
-- Charged once per order, never per unit.
alter table public.monitor_settings add column if not exists service_fee_kes           numeric not null default 3000;
-- Flat KES 3,000, not a percentage. The percentage below is opt-in: at 0 the
-- flat fee always applies. Set it above 0 only if large orders should switch
-- to a percentage of the buying price.
alter table public.monitor_settings add column if not exists service_fee_pct_over      numeric not null default 0;
alter table public.monitor_settings add column if not exists service_fee_threshold_kes numeric not null default 100000;

-- Photo of the shipping crate, set from the dashboard. Any URL works: a
-- Cloudinary link, or a path like /monitors/packaging.jpg for a file committed
-- to public/. Left blank, the "how it's packed" prompt simply doesn't appear.
alter table public.monitor_settings add column if not exists crate_photo_url text;

-- ── 2. The agreed rates ─────────────────────────────────────────────────────
-- The $15 cut is distributed so no line ever reads as margin: $5 rides inside
-- the crate (25 -> 30) and $10 inside freight. The buyer's total is unchanged.
update public.monitor_settings set
  usd_to_kes           = 135,
  crate_usd            = 30,
  freight_usd          = 10,
  margin_usd           = 0,
  -- Service fee is a flat KES 3,000. Both percentage routes off.
  service_fee_kes      = 3000,
  service_fee_pct_over = 0,
  service_fee_pct      = 0,
  updated_at           = now()
where id = 1;

-- ── 3. Freight for the two large sizes ──────────────────────────────────────
update public.monitor_shipping set shipping_kes = 14200, updated_at = now() where size_group = '40';
update public.monitor_shipping set shipping_kes = 18700, updated_at = now() where size_group = '49';

-- ── 4. Port layouts, priced per size ────────────────────────────────────────
-- The factory's interface upcharge depends on BOTH the size and the layout
-- (note 2 of the quotation): $1 to $8, and free for HDMI+DP+Audio on a 27".
create table if not exists public.monitor_port_options (
  id           uuid primary key default gen_random_uuid(),
  size_group   text not null,
  label        text not null,
  upcharge_usd numeric not null default 0,
  is_standard  boolean not null default false,
  sort_order   int not null default 0
);

create index if not exists monitor_port_options_size_idx
  on public.monitor_port_options (size_group, sort_order);

insert into public.monitor_port_options (size_group, label, upcharge_usd, is_standard, sort_order)
select * from (values
  ('21', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('24', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('27', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('32', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('34', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('40', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('49', '2x HDMI + 2x DP + Audio + DC',                            0, true,  1),
  ('21', 'HDMI + VGA + DP + Audio In + Audio Out',                  3, false, 2),
  ('21', 'HDMI + DVI + VGA + Audio In + Audio Out',                 5, false, 3),
  ('21', 'HDMI + DP + Audio',                                       1, false, 4),
  ('24', 'HDMI + VGA + DP + Audio In + Audio Out',                  3, false, 2),
  ('24', 'HDMI + DVI + VGA + Audio In + Audio Out',                 5, false, 3),
  ('24', 'HDMI + DP + Audio',                                       1, false, 4),
  ('27', 'HDMI + VGA + DP + Audio In + Audio Out',                  1, false, 2),
  ('27', 'HDMI + DVI + VGA + Audio In + Audio Out',                 5, false, 3),
  ('27', 'HDMI + DP + Audio',                                       0, false, 4),
  ('32', 'HDMI + DP + Type-C + USB-B + 2x USB-A + Audio',           8, false, 2),
  ('34', 'HDMI + DP + Type-C + USB-B + 2x USB-A + Audio',           8, false, 2),
  ('40', 'HDMI 2.1 + DP 1.4 + Type-C + USB-B + 2x USB-A + Audio',   7, false, 2)
) as v(size_group, label, upcharge_usd, is_standard, sort_order)
where not exists (select 1 from public.monitor_port_options);

alter table public.monitor_port_options enable row level security;
drop policy if exists "public reads monitor_port_options" on public.monitor_port_options;
create policy "public reads monitor_port_options" on public.monitor_port_options
  for select using (true);
drop policy if exists "admin writes monitor_port_options" on public.monitor_port_options;
create policy "admin writes monitor_port_options" on public.monitor_port_options
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- The first version's table is now unused. Left in place rather than dropped,
-- in case you want to look at it; nothing reads from it.
-- drop table if exists public.monitor_port_configs;

-- ── 5. Colours ──────────────────────────────────────────────────────────────
create table if not exists public.monitor_colors (
  id           uuid primary key default gen_random_uuid(),
  label        text not null unique,
  upcharge_usd numeric not null default 0,
  is_default   boolean not null default false,
  sort_order   int not null default 0
);

insert into public.monitor_colors (label, upcharge_usd, is_default, sort_order)
select * from (values
  ('Black', 0, true,  1),
  ('White', 0, false, 2),
  ('Pink',  2, false, 3)     -- the factory's own USD 2 for the pink shell
) as v(label, upcharge_usd, is_default, sort_order)
where not exists (select 1 from public.monitor_colors);

alter table public.monitor_colors enable row level security;
drop policy if exists "public reads monitor_colors" on public.monitor_colors;
create policy "public reads monitor_colors" on public.monitor_colors
  for select using (true);
drop policy if exists "admin writes monitor_colors" on public.monitor_colors;
create policy "admin writes monitor_colors" on public.monitor_colors
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Which colours each model comes in. Two values for nearly every row, so it
-- lives on the model and stays editable as plain text from the dashboard.
alter table public.monitor_models
  add column if not exists available_colors text[] not null default '{Black,White}';

update public.monitor_models
  set available_colors = '{Black,White}'
  where available_colors is null or cardinality(available_colors) = 0;

update public.monitor_models
  set available_colors = '{Black,White,Pink}'
  where model_code = 'HP-MX2381CQ';       -- the 23.8" 2K 100Hz

-- ============================================================================
--  CHECKS — the four things below tell you it worked
-- ============================================================================

-- Expect: 135 | 3 | 30 | 10 | 0 | 1900
select usd_to_kes, alibaba_pct, crate_usd, freight_usd, margin_usd, config_markup_kes
from public.monitor_settings where id = 1;

-- Expect a figure on every row, none blank.
select size_group, shipping_kes from public.monitor_shipping order by shipping_kes;

-- Expect 19 rows: 7 standard + 12 alternatives.
select size_group, count(*) as layouts from public.monitor_port_options group by size_group order by size_group;

-- Expect exactly one model in pink, HP-MX2381CQ.
select model_code, size_inches, res_label, refresh_hz, available_colors
from public.monitor_models where 'Pink' = any(available_colors);

-- Expect KES 24,000 for the 27" 1080p 100Hz.
select m.model_code, m.factory_usd,
  ceil((
    (m.factory_usd + m.factory_usd * s.alibaba_pct / 100
      + s.crate_usd + s.freight_usd + s.margin_usd
      + case when m.refresh_hz >= 165 then s.speakers_high_usd else s.speakers_low_usd end
      + s.rgb_usd
      + case when m.base_type = 'Fixed' then s.adj_base_usd else 0 end
      + s.cert_adapter_usd
    ) * s.usd_to_kes + sh.shipping_kes) / 100) * 100 as expected_kes
from public.monitor_models m
cross join public.monitor_settings s
join public.monitor_shipping sh on sh.size_group = '27'
where m.model_code = 'HP-Z2701CF';
