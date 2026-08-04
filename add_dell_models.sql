-- ============================================================================
--  D Series monitors for the /monitors storefront
--
--  Source: the bulk price list (Cnhopestar, quote 2026.6.1), "Dell Model" rows,
--  priced from its "Sample 1-9 pcs" column -- these models appear nowhere in the
--  older sheet, and 1-9 pcs is the small-quantity tier the storefront sells at.
--  NOTHING ELSE IS REPRICED. The existing catalogue keeps the old sheet's
--  figures exactly as they are.
--
--  Stored as "D Series", not "Dell". Putting another manufacturer's brand on the
--  storefront -- even inside a reference code -- is the same trap as the HP
--  prefix, and the series name travels in the WhatsApp message a buyer sends.
--  Say the word if you want it labelled differently.
--
--  Every row ships is_active = false, so nothing appears on the site until you
--  switch it on from Admin -> Monitors after confirming with your agent.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- Panel type, now that the bulk list actually states it per model.
alter table public.monitor_models add column if not exists panel_type text;

insert into public.monitor_models
  (size_inches, series, model_code, width_px, height_px, res_label, refresh_hz,
   curved, base_type, factory_usd, panel_type, sort_order)
select * from (values
  (21.5, 'D Series', 'HS-D215F100', 1920, 1080, '1080p', 100, false, 'Fixed', 53.97, 'IPS', 2010),
  (21.5, 'D Series', 'HS-D215F120', 1920, 1080, '1080p', 120, false, 'Fixed', 53.97, 'IPS', 2020),
  (23.8, 'D Series', 'HS-D238F100', 1920, 1080, '1080p', 100, false, 'Fixed', 55.66, 'IPS', 2030),
  (23.8, 'D Series', 'HS-D238F120', 1920, 1080, '1080p', 120, false, 'Fixed', 55.66, 'IPS', 2040),
  (23.8, 'D Series', 'HS-D238F165', 1920, 1080, '1080p', 165, false, 'Fixed', 58.19, 'IPS', 2050),
  (23.8, 'D Series', 'HS-D238F180', 1920, 1080, '1080p', 180, false, 'Fixed', 65.78, 'IPS', 2060),
  (23.8, 'D Series', 'HS-D238F200', 1920, 1080, '1080p', 200, false, 'Fixed', 65.78, 'IPS', 2070),
  (23.8, 'D Series', 'HS-D238F240', 1920, 1080, '1080p', 240, false, 'Fixed', 75.52, 'IPS', 2080),
  (23.8, 'D Series', 'HS-D238Q180', 2560, 1440, '2K', 180, false, 'Fixed', 90.3, 'IPS', 2090),
  (23.8, 'D Series', 'HS-D238U75', 3840, 2160, '4K', 75, false, 'Fixed', 126.42, 'IPS', 2100),
  (27, 'D Series', 'HS-D27F100', 1920, 1080, '1080p', 100, false, 'Fixed', 70.6, 'IPS', 2110),
  (27, 'D Series', 'HS-D27F120', 1920, 1080, '1080p', 120, false, 'Fixed', 70.6, 'IPS', 2120),
  (27, 'D Series', 'HS-D27F144', 1920, 1080, '1080p', 144, false, 'Fixed', 72.24, 'IPS', 2130),
  (27, 'D Series', 'HS-D27F180', 1920, 1080, '1080p', 180, false, 'Fixed', 81.27, 'IPS', 2140),
  (27, 'D Series', 'HS-D27F200', 1920, 1080, '1080p', 200, false, 'Fixed', 81.27, 'IPS', 2150),
  (27, 'D Series', 'HS-D27F240', 1920, 1080, '1080p', 240, false, 'Fixed', 96.04, 'IPS', 2160),
  (27, 'D Series', 'HS-D27F280', 1920, 1080, '1080p', 280, false, 'Fixed', 96.04, 'IPS', 2170),
  (27, 'D Series', 'HS-D27F380', 1920, 1080, '1080p', 380, false, 'Fixed', 146.94, 'IPS', 2180),
  (27, 'D Series', 'HS-D27F540', 1920, 1080, '1080p', 540, false, 'Fixed', 246.27, 'IPS', 2190),
  (27, 'D Series', 'HS-D27Q100', 2560, 1440, '2K', 100, false, 'Fixed', 73.06, 'IPS', 2200),
  (27, 'D Series', 'HS-D27Q180', 2560, 1440, '2K', 180, false, 'Fixed', 97.69, 'IPS', 2210),
  (27, 'D Series', 'HS-D27Q200', 2560, 1440, '2K', 200, false, 'Fixed', 97.69, 'IPS', 2220),
  (27, 'D Series', 'HS-D27Q240', 2560, 1440, '2K', 240, false, 'Fixed', 114.1, 'IPS', 2230),
  (27, 'D Series', 'HS-D27Q320', 2560, 1440, '2K', 320, false, 'Fixed', 128.88, 'IPS', 2240),
  (27, 'D Series', 'HS-D27U75', 3840, 2160, '4K', 75, false, 'Fixed', 114.1, 'IPS', 2250),
  (27, 'D Series', 'HS-D27U144', 3840, 2160, '4K', 144, false, 'Fixed', 192.09, 'IPS', 2260),
  (27, 'D Series', 'HS-D27N70', 5120, 2880, '5K', 70, false, 'Fixed', 246.27, 'IPS', 2270)
) as v(size_inches, series, model_code, width_px, height_px, res_label, refresh_hz,
       curved, base_type, factory_usd, panel_type, sort_order)
where not exists (
  select 1 from public.monitor_models where series = 'D Series'
);

-- These arrive switched OFF. Turn them on per model from the dashboard, or all
-- at once here once your agent has confirmed availability:
--   update public.monitor_models set is_active = true where series = 'D Series';
update public.monitor_models set is_active = false
  where series = 'D Series' and is_active is distinct from true;

-- Front-facing photos lifted from the bulk list itself, matched by the cell
-- anchor each picture sits in (column C is the front shot, column D the back).
update public.monitor_models set image_url = '/monitors/photo-14-dell-21.jpg'
  where series = 'D Series' and size_inches < 22 and image_url is null;
update public.monitor_models set image_url = '/monitors/photo-15-dell-24.jpg'
  where series = 'D Series' and size_inches >= 22 and image_url is null;

-- ── Checks ──────────────────────────────────────────────────────────────────
-- Expect 27 rows, all IPS, all inactive.
select size_inches, count(*) as models, min(panel_type) as panel, bool_or(is_active) as any_live
from public.monitor_models where series = 'D Series'
group by size_inches order by size_inches;

-- Confirm nothing else was touched: the old catalogue keeps its prices.
select series, count(*) as models, min(factory_usd) as cheapest, max(factory_usd) as dearest
from public.monitor_models group by series order by series;
