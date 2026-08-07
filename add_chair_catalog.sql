-- ============================================================================
--  Ergonomic chair catalogue — the /corporate bulk catalogue.
--  Source: "Ergomomic chairs with price.xlsx" (Dragonben), 21 SKUs across 14
--  models. The sheet's only price column is "Price/40 HC container ($/pcs)" —
--  the per-piece price at FULL container volume — so everything below a
--  container carries the owner's small-lot uplift (see chair_settings).
--
--  This is the ERGONOMIC line. Office chairs and any other chair type get their
--  own rows in chair_models with a different `line` value; nothing here assumes
--  ergonomic is the only line.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- ── One editable row of rates: change a number here, the whole list reprices ──
create table if not exists public.chair_settings (
  id               int primary key default 1,
  usd_to_kes       numeric not null default 135,
  -- Transaction fee on the whole payment to the supplier, exactly as on the
  -- monitor list — the goods, the small-lot uplift and the freight component
  -- all ride on the same invoice.
  txn_pct          numeric not null default 3,
  -- The USD freight component that sits inside the supplier's invoice. The real
  -- landed shipping is kes_per_cbm below; this is not it.
  freight_usd      numeric not null default 5,
  -- Added PER PIECE whenever the order is below a full container. Most orders
  -- are, so most buyers pay it.
  small_lot_usd    numeric not null default 20,
  -- Kept at zero on purpose: on /corporate the owner's cut is the visible
  -- "Procurement & handling" fee, not a hidden per-chair margin. Set it above
  -- zero only if a per-chair cut should also apply.
  margin_usd       numeric not null default 0,
  -- Sea freight + duty + clearing to Nairobi, per cubic metre.
  -- NULL ON PURPOSE. While this is null the catalogue shows specs but no
  -- prices — the page can never quote a figure the owner hasn't approved.
  kes_per_cbm      numeric,
  -- Usable volume of a 40ft high-cube. Divided by a model's CBM to get the
  -- quantity at which container pricing kicks in.
  container_cbm    numeric not null default 68,
  updated_at       timestamptz not null default now(),
  constraint chair_settings_single_row check (id = 1)
);

insert into public.chair_settings (id) values (1) on conflict (id) do nothing;

-- ── The models ──────────────────────────────────────────────────────────────
create table if not exists public.chair_models (
  id             uuid primary key default gen_random_uuid(),
  line           text not null default 'Ergonomic',  -- 'Ergonomic' | 'Office' | …
  model_code     text not null,           -- the reference a buyer sees
  factory_ref    text,                    -- internal: the factory's own name, never rendered
  name           text not null,           -- display name
  description    text,                    -- the supplier's '/'-separated feature list
  carton_l_cm    numeric,
  carton_w_cm    numeric,
  carton_h_cm    numeric,
  weight_kg      numeric,
  cbm            numeric generated always as
                   (coalesce(carton_l_cm,0) * coalesce(carton_w_cm,0) * coalesce(carton_h_cm,0) / 1000000) stored,
  container_usd  numeric not null,        -- per piece at full 40HC, base colour
  moq            int not null default 10,
  is_active      boolean not null default true,
  brand          text,
  brand_public   boolean not null default false,  -- factory brand stays internal
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create unique index if not exists chair_models_code_idx on public.chair_models (line, model_code);

-- ── Colours ─────────────────────────────────────────────────────────────────
-- The sheet prices some colours differently (grey is usually +$3), so a colour
-- is a priced option with its own photo rather than a label.
create table if not exists public.chair_colors (
  id           uuid primary key default gen_random_uuid(),
  model_id     uuid not null references public.chair_models (id) on delete cascade,
  label        text not null,
  upcharge_usd numeric not null default 0,
  image_url    text,
  is_default   boolean not null default false,
  sort_order   int not null default 0
);

create index if not exists chair_colors_model_idx on public.chair_colors (model_id, sort_order);

-- ── Procurement & handling fee ──────────────────────────────────────────────
-- ONE visible fee on a corporate quote, charged on goods value only — never on
-- freight or duty — and tapering as the order grows. Shared by every corporate
-- category, not just chairs.
create table if not exists public.corporate_handling_bands (
  id           uuid primary key default gen_random_uuid(),
  up_to_kes    numeric,                  -- null = the top band, no ceiling
  pct          numeric not null,
  min_fee_kes  numeric not null default 0,
  sort_order   int not null default 0
);

insert into public.corporate_handling_bands (up_to_kes, pct, min_fee_kes, sort_order)
select * from (values
  (500000::numeric,  10::numeric, 15000::numeric, 1),
  (1500000::numeric,  8::numeric, 15000::numeric, 2),
  (3000000::numeric, 6.5::numeric, 15000::numeric, 3),
  (null::numeric,     5::numeric, 15000::numeric, 4)
) as v(up_to_kes, pct, min_fee_kes, sort_order)
where not exists (select 1 from public.corporate_handling_bands);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.chair_settings           enable row level security;
alter table public.chair_models             enable row level security;
alter table public.chair_colors             enable row level security;
alter table public.corporate_handling_bands enable row level security;

drop policy if exists "public reads chair settings" on public.chair_settings;
create policy "public reads chair settings" on public.chair_settings for select using (true);
drop policy if exists "admin manages chair settings" on public.chair_settings;
create policy "admin manages chair settings" on public.chair_settings
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "public reads chair models" on public.chair_models;
create policy "public reads chair models" on public.chair_models for select using (true);
drop policy if exists "admin manages chair models" on public.chair_models;
create policy "admin manages chair models" on public.chair_models
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "public reads chair colors" on public.chair_colors;
create policy "public reads chair colors" on public.chair_colors for select using (true);
drop policy if exists "admin manages chair colors" on public.chair_colors;
create policy "admin manages chair colors" on public.chair_colors
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "public reads handling bands" on public.corporate_handling_bands;
create policy "public reads handling bands" on public.corporate_handling_bands for select using (true);
drop policy if exists "admin manages handling bands" on public.corporate_handling_bands;
create policy "admin manages handling bands" on public.corporate_handling_bands
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── The 14 ergonomic models ─────────────────────────────────────────────────
-- Inserted only when the line is empty, so re-running this file never
-- overwrites a price, a photo or an active flag you've changed in the dashboard.
insert into public.chair_models
  (line, model_code, factory_ref, name, description, carton_l_cm, carton_w_cm, carton_h_cm, weight_kg, container_usd, brand, sort_order)
select * from (values
  ('Ergonomic', '015-M', '015 (Mesh seat)', '015 Mesh-Seat Task Chair',
   '3D armrests/regular feet/chenille set/with stool feet/four-level gas rod/adaptive lumbar support/seat depth and turn adjustment',
   72::numeric, 40::numeric, 60::numeric, 17.1::numeric, 42.5::numeric, 'Dragonben', 1),
  ('Ergonomic', '015-S', '015 (Spong seat)', '015 Sponge-Seat Task Chair',
   '3D armrests/nylon feet/chenille fabric/footrest/four-stage gas rod/adaptive lumbar support/seat depth adjustment',
   72::numeric, 40::numeric, 60::numeric, 17.1::numeric, 42.5::numeric, 'Dragonben', 2),
  ('Ergonomic', '016', '016', '016 Headrest Task Chair',
   'Liftable headrest/4D armrest/steel feet/special mesh/footrest/four-stage gas rod/adaptive lumbar support/front and rear seat depth adjustment',
   70::numeric, 40::numeric, 60::numeric, 19::numeric, 71.5::numeric, 'Dragonben', 3),
  ('Ergonomic', 'SG-018', 'SG-018', 'SG-018 Executive Mesh Chair',
   'Liftable headrest/8D armrest/steel feet/special mesh/footrest/four-stage gas rod/seat depth adjustment/backrest adjustment/adaptive lumbar support',
   70::numeric, 42::numeric, 65::numeric, 20::numeric, 87.8::numeric, 'Dragonben', 4),
  ('Ergonomic', 'SG-019', 'SG-019', 'SG-019 Aluminium-Base Executive Chair',
   'Liftable headrest/8D armrest/aluminum alloy feet/special mesh/footrest/four-stage gas rod/seat depth adjustment/backrest adjustment/folding three-way lumbar support',
   70::numeric, 42::numeric, 65::numeric, 20.15::numeric, 105::numeric, 'Dragonben', 5),
  ('Ergonomic', 'AS-1', E'战甲1号 (High configuration)', 'Armour 1 Ergonomic Chair — High Spec',
   'Liftable headrest/8D armrest/steel feet/special mesh/footrest/four-stage gas rod/seat depth adjustment/backrest adjustment/folding three-way lumbar support',
   75::numeric, 46::numeric, 64::numeric, 20.85::numeric, 89::numeric, 'Dragonben', 6),
  ('Ergonomic', 'AS-2', E'战甲2号 (low configuration)', 'Armour 2 Ergonomic Chair — Standard',
   'Liftable headrest/4D armrest/nylon feet/special mesh/footrest/four-stage gas rod/adaptive lumbar support/front and rear seat depth adjustment',
   84::numeric, 38::numeric, 64::numeric, 20.3::numeric, 85::numeric, 'Dragonben', 7),
  ('Ergonomic', 'AS-2H', E'战甲2号 (high configuration)', 'Armour 2 Ergonomic Chair — High Spec',
   'Liftable headrest/8D armrest/steel footrest/special mesh/footrest/four-stage gas rod/adaptive lumbar support/seat depth adjustment',
   84::numeric, 38::numeric, 64::numeric, 20.3::numeric, 85::numeric, 'Dragonben', 8),
  ('Ergonomic', 'SG-366', 'SG-366', 'SG-366 Mesh Task Chair',
   '4D armrests/steel feet/special mesh/footrest/four-stage gas rod/adaptive lumbar support/seat depth adjustment',
   88::numeric, 36::numeric, 60::numeric, 17.4::numeric, 66::numeric, 'Dragonben', 9),
  ('Ergonomic', 'T6', 'T6', 'T6 Headrest Task Chair',
   'Liftable headrest/4D armrest/nylon feet/special mesh/footrest/four-stage gas rod/adaptive lumbar support/seat depth adjustment/backrest adjustment',
   73::numeric, 43::numeric, 59::numeric, 18.3::numeric, 67::numeric, 'Dragonben', 10),
  ('Ergonomic', 'T8', 'T8', 'T8 Executive Mesh Chair',
   'Liftable headrest/8D armrest/steel feet/special mesh/footrest/four-stage gas rod/adaptive lumbar support/seat depth adjustment/backrest adjustment',
   73::numeric, 43::numeric, 59::numeric, 20::numeric, 77::numeric, 'Dragonben', 11),
  ('Ergonomic', 'T9', 'T9', 'T9 Dual-Lumbar Task Chair',
   '6D armrests/steel feet/special mesh/footrest/four-stage gas rod/adaptive double lumbar support/seat depth adjustment/backrest adjustment',
   73::numeric, 43::numeric, 50::numeric, 20.05::numeric, 73::numeric, 'Dragonben', 12),
  ('Ergonomic', '1062', '1062', '1062 Headrest Task Chair',
   'Liftable headrest/4D armrest/nylon feet/special mesh/footrest/four-stage gas rod/backrest vertical adjustment/lumbar support vertical adjustment',
   88::numeric, 68::numeric, 40::numeric, 20.96::numeric, 69::numeric, 'Dragonben', 13),
  ('Ergonomic', '1066', '1066', '1066 Dual-Backrest Executive Chair',
   'Liftable headrest/8D armrest/steel feet/special mesh/footrest/four-stage gas rod/adaptive double backrest/built-in hanger/seat depth adjustment',
   88::numeric, 68::numeric, 40::numeric, 22.2::numeric, 99::numeric, 'Dragonben', 14)
) as v(line, model_code, factory_ref, name, description, carton_l_cm, carton_w_cm, carton_h_cm, weight_kg, container_usd, brand, sort_order)
where not exists (select 1 from public.chair_models where line = 'Ergonomic');

-- ── Colours ─────────────────────────────────────────────────────────────────
-- Upcharges are the supplier's own: grey is $3 over black on most models, and
-- where the sheet quotes one price for two colours the upcharge is zero.
insert into public.chair_colors (model_id, label, upcharge_usd, image_url, is_default, sort_order)
select m.id, v.label, v.upcharge_usd, v.image_url, v.is_default, v.sort_order
from (values
  ('015-M',  'Black', 0::numeric,   '/chairs/015m-black.png',  true,  1),
  ('015-M',  'Grey',  3::numeric,   '/chairs/015m-grey.png',   false, 2),
  ('015-S',  'Black', 0::numeric,   '/chairs/015s-black.png',  true,  1),
  ('015-S',  'Grey',  3::numeric,   '/chairs/015s-grey.png',   false, 2),
  ('016',    'Black', 0::numeric,   '/chairs/016.png',         true,  1),
  ('016',    'Grey',  0::numeric,   '/chairs/016.png',         false, 2),
  ('SG-018', 'Black', 0::numeric,   '/chairs/sg018.png',       true,  1),
  ('SG-018', 'Grey',  0::numeric,   '/chairs/sg018.png',       false, 2),
  ('SG-019', 'Grey',  0::numeric,   '/chairs/sg019.png',       true,  1),
  ('AS-1',   'Black', 0::numeric,   '/chairs/a1-high.png',     true,  1),
  ('AS-1',   'Grey',  0::numeric,   '/chairs/a1-high.png',     false, 2),
  ('AS-1',   'Red',   0::numeric,   '/chairs/a1-high.png',     false, 3),
  ('AS-1',   'Pink',  0::numeric,   '/chairs/a1-high.png',     false, 4),
  ('AS-2',   'Black', 0::numeric,   '/chairs/a2-low.png',      true,  1),
  ('AS-2',   'Grey',  0::numeric,   '/chairs/a2-low.png',      false, 2),
  ('AS-2',   'Red',   0::numeric,   '/chairs/a2-low.png',      false, 3),
  ('AS-2',   'Pink',  0::numeric,   '/chairs/a2-low.png',      false, 4),
  ('AS-2H',  'Black', 0::numeric,   '/chairs/a2-high.png',     true,  1),
  ('AS-2H',  'Grey',  0::numeric,   '/chairs/a2-high.png',     false, 2),
  ('AS-2H',  'Red',   0::numeric,   '/chairs/a2-high.png',     false, 3),
  ('AS-2H',  'Pink',  0::numeric,   '/chairs/a2-high.png',     false, 4),
  ('SG-366', 'Black', 0::numeric,   '/chairs/sg366-black.png', true,  1),
  ('SG-366', 'Grey',  3::numeric,   '/chairs/sg366-grey.png',  false, 2),
  ('T6',     'Black', 0::numeric,   '/chairs/t6-black.png',    true,  1),
  ('T6',     'Grey',  3::numeric,   '/chairs/t6-grey.png',     false, 2),
  ('T8',     'Black', 0::numeric,   '/chairs/t8-black.png',    true,  1),
  ('T8',     'Grey',  3::numeric,   '/chairs/t8-grey.png',     false, 2),
  ('T9',     'Black', 0::numeric,   '/chairs/t9-black.png',    true,  1),
  ('T9',     'Grey',  3::numeric,   '/chairs/t9-grey.png',     false, 2),
  ('1062',   'Black', 0::numeric,   '/chairs/1062-black.png',  true,  1),
  ('1062',   'Grey',  0::numeric,   '/chairs/1062-grey.png',   false, 2),
  ('1066',   'Black', 0::numeric,   '/chairs/1066.png',        true,  1),
  ('1066',   'Grey',  0::numeric,   '/chairs/1066.png',        false, 2)
) as v(model_code, label, upcharge_usd, image_url, is_default, sort_order)
join public.chair_models m on m.model_code = v.model_code and m.line = 'Ergonomic'
where not exists (select 1 from public.chair_colors);

-- ── Quotes can now carry the configured lines ───────────────────────────────
-- buyer_type finally gets a column of its own; it used to ride inside notes.
alter table public.corporate_quotes add column if not exists line_items jsonb;
alter table public.corporate_quotes add column if not exists buyer_type text;

-- ── Make the category visible on /corporate ─────────────────────────────────
-- No model count in the blurb: the page counts the live models itself, and a
-- number typed in here would contradict it the moment one is switched off.
update public.corporate_categories
   set blurb = 'Mesh and sponge task seating, sourced to order'
 where name = 'Ergonomic Chairs'
   and (blurb is null
        or blurb = 'Hbada & high-end series'
        or blurb like '%14 models%');
