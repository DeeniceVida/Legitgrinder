-- ============================================================================
--  Monitor catalogue -- the /monitors storefront (single & small-quantity buyers)
--  Source: HOPE 21.5"-49" LCD Monitor Quotation List (Shenzhen Hopestar), the
--  supplier's "Sample 1-5PCS" price sheet, plus the owner's newer 49" quote.
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- ── One editable row of rates: change a number here, the whole list reprices ──
create table if not exists public.monitor_settings (
  id                  int primary key default 1,
  usd_to_kes          numeric not null default 130,
  alibaba_pct         numeric not null default 3,      -- Alibaba's cut of the factory price
  crate_usd           numeric not null default 25,     -- wooden crate, per unit
  margin_usd          numeric not null default 15,     -- the owner's cut (never shown)
  -- Standard inclusions. The owner sells every monitor fully specced, so these
  -- supplier upcharges are costs, not buyer choices.
  speakers_low_usd    numeric not null default 3,      -- under 165Hz
  speakers_high_usd   numeric not null default 1.5,    -- 165Hz and above
  rgb_usd             numeric not null default 2,
  adj_base_usd        numeric not null default 7,      -- only where the base is Fixed
  cert_adapter_usd    numeric not null default 2,
  alt_config_kes      numeric not null default 1900,   -- non-standard port config
  service_fee_pct     numeric not null default 0,      -- retail service fee, if any
  updated_at          timestamptz not null default now(),
  constraint monitor_settings_single_row check (id = 1)
);

insert into public.monitor_settings (id) values (1) on conflict (id) do nothing;

-- ── Shipping is quoted per size, in KES, per unit ────────────────────────────
create table if not exists public.monitor_shipping (
  size_group  text primary key,     -- '21' | '24' | '27' | '32' | '34' | '40' | '49'
  shipping_kes numeric,             -- null = no price shown, quote on request
  updated_at  timestamptz not null default now()
);

insert into public.monitor_shipping (size_group, shipping_kes) values
  ('21', 5300),
  ('24', 6400),
  ('27', 7300),
  ('32', 10100),
  ('34', 11700),
  ('40', null),   -- not yet supplied by the owner
  ('49', null)    -- not yet supplied by the owner
on conflict (size_group) do nothing;

-- ── Port configurations offered ──────────────────────────────────────────────
create table if not exists public.monitor_port_configs (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  is_standard boolean not null default false,
  sort_order  int not null default 0
);

insert into public.monitor_port_configs (label, is_standard, sort_order)
select * from (values
  ('2x HDMI + 2x DP + Audio + DC', true, 1),
  ('HDMI + DP + USB-A + USB-B + Type-C + Audio + DC', false, 2),
  ('2x HDMI + DP + Type-C + Audio + DC', false, 3)
) as v(label, is_standard, sort_order)
where not exists (select 1 from public.monitor_port_configs);

-- ── The catalogue ───────────────────────────────────────────────────────────
create table if not exists public.monitor_models (
  id           uuid primary key default gen_random_uuid(),
  size_inches  numeric not null,
  series       text,                      -- Victory | Golden Cudgel | MX
  model_code   text not null,
  alt_code     text,                      -- sibling code quoted at the same price
  width_px     int,
  height_px    int,
  res_label    text,                      -- 1080p | 2K | 4K | 5K | UWQHD | 5K Ultrawide
  refresh_hz   int,
  curved       boolean not null default false,
  base_type    text not null default 'Fixed',   -- Fixed | Lifting
  factory_usd  numeric not null,
  image_url    text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists monitor_models_size_idx on public.monitor_models (size_inches, sort_order);

-- ── Row level security: the world reads, only admin writes ──────────────────
alter table public.monitor_models      enable row level security;
alter table public.monitor_settings    enable row level security;
alter table public.monitor_shipping    enable row level security;
alter table public.monitor_port_configs enable row level security;

-- Anyone may read the catalogue (the storefront needs it); only an admin writes.
drop policy if exists "public reads monitor_models" on public.monitor_models;
create policy "public reads monitor_models" on public.monitor_models
  for select using (true);
drop policy if exists "admin writes monitor_models" on public.monitor_models;
create policy "admin writes monitor_models" on public.monitor_models
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "public reads monitor_settings" on public.monitor_settings;
create policy "public reads monitor_settings" on public.monitor_settings
  for select using (true);
drop policy if exists "admin writes monitor_settings" on public.monitor_settings;
create policy "admin writes monitor_settings" on public.monitor_settings
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "public reads monitor_shipping" on public.monitor_shipping;
create policy "public reads monitor_shipping" on public.monitor_shipping
  for select using (true);
drop policy if exists "admin writes monitor_shipping" on public.monitor_shipping;
create policy "admin writes monitor_shipping" on public.monitor_shipping
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "public reads monitor_port_configs" on public.monitor_port_configs;
create policy "public reads monitor_port_configs" on public.monitor_port_configs
  for select using (true);
drop policy if exists "admin writes monitor_port_configs" on public.monitor_port_configs;
create policy "admin writes monitor_port_configs" on public.monitor_port_configs
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── Seed: 99 models ─────────────────────────────────────────────
insert into public.monitor_models
  (size_inches, series, model_code, alt_code, width_px, height_px, res_label, refresh_hz, curved, base_type, factory_usd, sort_order)
select * from (values
  (21.5, 'Victory', 'HP-Z2151CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 45.5, 10),
  (21.5, 'Victory', 'HP-Z2151DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 45.5, 20),
  (23.8, 'Victory', 'HP-Z2381CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 51, 30),
  (23.8, 'Victory', 'HP-Z2381DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 51, 40),
  (23.8, 'Victory', 'HP-Z2381FF', null, 1920, 1080, '1080p', 165, false, 'Fixed', 59.5, 50),
  (23.8, 'Victory', 'HP-Z2381MF', null, 1920, 1080, '1080p', 180, false, 'Fixed', 67.5, 60),
  (24.5, 'Victory', 'HP-Z2451CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 53, 70),
  (24.5, 'Victory', 'HP-Z2451DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 53, 80),
  (24.5, 'Victory', 'HP-Z2451MF', null, 1920, 1080, '1080p', 200, false, 'Fixed', 67.5, 90),
  (24.5, 'Victory', 'HP-Z2451HF', null, 1920, 1080, '1080p', 240, false, 'Fixed', 90.5, 100),
  (24.5, 'Victory', 'HP-Z2451SF', null, 1920, 1080, '1080p', 320, false, 'Fixed', 102, 110),
  (27, 'Victory', 'HP-Z2701CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 67.5, 120),
  (27, 'Victory', 'HP-Z2701DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 67.5, 130),
  (27, 'Victory', 'HP-Z2701EF', null, 1920, 1080, '1080p', 144, false, 'Fixed', 72.5, 140),
  (27, 'Victory', 'HP-Z2701GF', null, 1920, 1080, '1080p', 180, false, 'Fixed', 84, 150),
  (27, 'Victory', 'HP-Z2701HF', null, 1920, 1080, '1080p', 240, false, 'Fixed', 97, 160),
  (27, 'Victory', 'HP-Z2701CQ', null, 2560, 1440, '2K', 100, false, 'Fixed', 82.5, 170),
  (23.8, 'Victory', 'HP-Z2381CCF', null, 1920, 1080, '1080p', 100, true, 'Fixed', 51, 180),
  (23.8, 'Victory', 'HP-Z2381CDF', null, 1920, 1080, '1080p', 120, true, 'Fixed', 51, 190),
  (23.8, 'Victory', 'HP-Z2381CGF', 'HP-Z2381CMF', 1920, 1080, '1080p', 200, true, 'Fixed', 66, 200),
  (27, 'Victory', 'HP-Z2701CCF', null, 1920, 1080, '1080p', 100, true, 'Fixed', 67.5, 210),
  (27, 'Victory', 'HP-Z2701CDF', null, 1920, 1080, '1080p', 120, true, 'Fixed', 67.5, 220),
  (27, 'Victory', 'HP-Z2701CGF', null, 1920, 1080, '1080p', 180, true, 'Fixed', 87.5, 230),
  (27, 'Victory', 'HP-Z2701CMF', null, 1920, 1080, '1080p', 200, true, 'Fixed', 87.5, 240),
  (27, 'Victory', 'HP-Z2701CPF', null, 1920, 1080, '1080p', 280, true, 'Fixed', 95.5, 250),
  (27, 'Victory', 'HP-Z2701CCQ', null, 2560, 1440, '2K', 100, true, 'Fixed', 94, 260),
  (27, 'Victory', 'HP-Z2701CGQ', null, 2560, 1440, '2K', 180, true, 'Fixed', 100.5, 270),
  (21.45, 'Golden Cudgel', 'HP-JGB2145CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 45.5, 280),
  (21.45, 'Golden Cudgel', 'HP-JGB2145DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 45.5, 290),
  (23.8, 'Golden Cudgel', 'HP-JGB2381CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 51, 300),
  (23.8, 'Golden Cudgel', 'HP-JGB2381DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 51, 310),
  (23.8, 'Golden Cudgel', 'HP-JGB2381FF', null, 1920, 1080, '1080p', 165, false, 'Fixed', 57.5, 320),
  (23.8, 'Golden Cudgel', 'HP-JGB2381GF', null, 1920, 1080, '1080p', 180, false, 'Fixed', 66, 330),
  (23.8, 'Golden Cudgel', 'HP-JGB2381MF', null, 1920, 1080, '1080p', 200, false, 'Fixed', 66, 340),
  (27, 'Golden Cudgel', 'HP-JGB2701CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 67.5, 350),
  (27, 'Golden Cudgel', 'HP-JGB2701DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 67.5, 360),
  (27, 'Golden Cudgel', 'HP-JGB2701EF', null, 1920, 1080, '1080p', 144, false, 'Fixed', 74, 370),
  (27, 'Golden Cudgel', 'HP-JGB2701GF', null, 1920, 1080, '1080p', 180, false, 'Fixed', 82.5, 380),
  (27, 'Golden Cudgel', 'HP-JGB2701PF', null, 1920, 1080, '1080p', 280, false, 'Fixed', 95.5, 390),
  (27, 'Golden Cudgel', 'HP-JGB2701QF', null, 1920, 1080, '1080p', 380, false, 'Fixed', 151.5, 400),
  (27, 'Golden Cudgel', 'HP-JGB2701CQ', null, 2560, 1440, '2K', 100, false, 'Fixed', 79, 410),
  (27, 'Golden Cudgel', 'HP-JGB2701GQ', null, 2560, 1440, '2K', 180, false, 'Fixed', 100.5, 420),
  (27, 'Golden Cudgel', 'HP-JGB2701GQ', null, 2560, 1440, '2K', 240, false, 'Fixed', 118.5, 430),
  (27, 'Golden Cudgel', 'HP-JGB2701BU', null, 3840, 2160, '4K', 75, false, 'Fixed', 113.5, 440),
  (23.8, 'MX', 'HP-MX2381CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 57.5, 450),
  (23.8, 'MX', 'HP-MX2381DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 57.5, 460),
  (23.8, 'MX', 'HP-MX2381FF', null, 1920, 1080, '1080p', 165, false, 'Fixed', 62.5, 470),
  (23.8, 'MX', 'HP-MX2381GF', null, 1920, 1080, '1080p', 180, false, 'Fixed', 72.5, 480),
  (23.8, 'MX', 'HP-MX2381MF', null, 1920, 1080, '1080p', 200, false, 'Fixed', 72.5, 490),
  (23.8, 'MX', 'HP-MX2381HF', null, 1920, 1080, '1080p', 240, false, 'Fixed', 95.5, 500),
  (23.8, 'MX', 'HP-MX2381CQ', null, 2560, 1440, '2K', 100, false, 'Fixed', 72.5, 510),
  (23.8, 'MX', 'HP-MX2381GQ', null, 2560, 1440, '2K', 180, false, 'Fixed', 95.5, 520),
  (23.8, 'MX', 'HP-MX2381BU', null, 3840, 2160, '4K', 75, false, 'Fixed', 131.5, 530),
  (24.5, 'MX', 'HP-MX2451CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 57.5, 540),
  (24.5, 'MX', 'HP-MX2451DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 57.5, 550),
  (24.5, 'MX', 'HP-MX2451GF', 'HP-MX2451MF', 1920, 1080, '1080p', 200, false, 'Fixed', 72.5, 560),
  (24.5, 'MX', 'HP-MX2451HF', null, 1920, 1080, '1080p', 240, false, 'Fixed', 95.5, 570),
  (24.5, 'MX', 'HP-MX2451SF', null, 1920, 1080, '1080p', 320, false, 'Fixed', 107, 580),
  (24.5, 'MX', 'HP-MX2451JF', null, 1920, 1080, '1080p', 360, false, 'Fixed', 169.5, 590),
  (24.5, 'MX', 'HP-MX2451VF', null, 1920, 1080, '1080p', 400, false, 'Fixed', 169.5, 600),
  (24.5, 'MX', 'HP-MX2451HQ', null, 2560, 1440, '2K', 240, false, 'Fixed', 120, 610),
  (27, 'MX', 'HP-MX277CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 74, 620),
  (27, 'MX', 'HP-MX277DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 74, 630),
  (27, 'MX', 'HP-MX277EF', null, 1920, 1080, '1080p', 144, false, 'Fixed', 79, 640),
  (27, 'MX', 'HP-MX277GF', null, 1920, 1080, '1080p', 180, false, 'Fixed', 89, 650),
  (27, 'MX', 'HP-MX277HF', null, 1920, 1080, '1080p', 240, false, 'Fixed', 97, 660),
  (27, 'MX', 'HP-MX277PF', null, 1920, 1080, '1080p', 280, false, 'Fixed', 97, 670),
  (27, 'MX', 'HP-MX277QF', null, 1920, 1080, '1080p', 380, false, 'Fixed', 159.5, 680),
  (27, 'MX', 'HP-MX277RF', null, 1920, 1080, '1080p', 540, false, 'Fixed', 291, 690),
  (27, 'MX', 'HP-MX277CQ', null, 2560, 1440, '2K', 100, false, 'Fixed', 85.5, 700),
  (27, 'MX', 'HP-MX277GQ', null, 2560, 1440, '2K', 180, false, 'Fixed', 105.5, 710),
  (27, 'MX', 'HP-MX277HQ', null, 2560, 1440, '2K', 240, false, 'Fixed', 126.5, 720),
  (27, 'MX', 'HP-MX277SQ', null, 2560, 1440, '2K', 320, false, 'Fixed', 143, 730),
  (27, 'MX', 'HP-MX277BU', null, 3840, 2160, '4K', 75, false, 'Fixed', 118.5, 740),
  (27, 'MX', 'HP-MX277DU', null, 3840, 2160, '4K', 120, false, 'Fixed', 135, 750),
  (27, 'MX', 'HP-MX277EU', null, 3840, 2160, '4K', 144, false, 'Fixed', 184, 760),
  (27, 'MX', 'HP-MX277TN', null, 5120, 2880, '5K', 70, false, 'Fixed', 279.5, 770),
  (27, 'MX', 'HP-MC273CF', null, 1920, 1080, '1080p', 100, true, 'Fixed', 76, 780),
  (27, 'MX', 'HP-MC273DF', null, 1920, 1080, '1080p', 120, true, 'Fixed', 76, 790),
  (27, 'MX', 'HP-MC273GF', null, 1920, 1080, '1080p', 180, true, 'Fixed', 92, 800),
  (27, 'MX', 'HP-MC273PF', null, 1920, 1080, '1080p', 280, true, 'Fixed', 99, 810),
  (27, 'MX', 'HP-MC273CQ', null, 2560, 1440, '2K', 100, true, 'Fixed', 89, 820),
  (27, 'MX', 'HP-MC273GQ', null, 2560, 1440, '2K', 180, true, 'Fixed', 107, 830),
  (34, 'MX', 'HP-MX342CU', null, 3440, 1440, 'UWQHD', 100, true, 'Lifting', 128.5, 840),
  (34, 'MX', 'HP-MX342GU', null, 3440, 1440, 'UWQHD', 180, true, 'Lifting', 140, 850),
  (32, 'MX', 'HP-ME322CF', null, 1920, 1080, '1080p', 100, false, 'Fixed', 108.5, 860),
  (32, 'MX', 'HP-ME322DF', null, 1920, 1080, '1080p', 120, false, 'Fixed', 108.5, 870),
  (32, 'MX', 'HP-MX322GF', null, 1920, 1080, '1080p', 165, false, 'Fixed', 118.5, 880),
  (32, 'MX', 'HP-MX322HF', null, 1920, 1080, '1080p', 240, false, 'Fixed', 133.5, 890),
  (32, 'MX', 'HP-MX322CQ', null, 2560, 1440, '2K', 100, false, 'Fixed', 117, 900),
  (32, 'MX', 'HP-MX322GQ', null, 2560, 1440, '2K', 180, false, 'Fixed', 133.5, 910),
  (32, 'MX', 'HP-MX322HQ', null, 2560, 1440, '2K', 240, false, 'Fixed', 164.5, 920),
  (32, 'MX', 'HP-MX322AU', null, 3840, 2160, '4K', 75, false, 'Fixed', 149.5, 930),
  (32, 'MX', 'HP-MX322UU', null, 3840, 2160, '4K', 150, false, 'Fixed', 210.5, 940),
  (40, null, 'HP-4001DL', null, 5120, 2160, '5K Ultrawide', 120, false, 'Lifting', 299, 950),
  (49, null, 'HP-4901-4K165', null, 3840, 2160, '4K', 165, false, 'Lifting', 298, 960),
  (49, null, 'HP-4901-5K120', null, 5120, 1440, '5K Ultrawide', 120, false, 'Lifting', 298, 970),
  (49, null, 'HP-4901-5K165', null, 5120, 1440, '5K Ultrawide', 165, false, 'Lifting', 314, 980),
  (49, null, 'HP-4901-5K240', null, 5120, 1440, '5K Ultrawide', 240, false, 'Lifting', 388, 990)
) as v(size_inches, series, model_code, alt_code, width_px, height_px, res_label, refresh_hz, curved, base_type, factory_usd, sort_order)
where not exists (select 1 from public.monitor_models);
