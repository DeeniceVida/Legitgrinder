-- ============================================================================
--  Adopt the agreed monitor rates + the 40"/49" freight figures.
--
--  Why this file exists: add_monitor_catalog.sql seeds monitor_settings with
--  "on conflict (id) do nothing" and monitor_shipping with "on conflict
--  (size_group) do nothing", which is right -- a re-run must never wipe rates
--  you've edited. The side effect is that if you ran an earlier version of that
--  file, the newer defaults were never picked up. These explicit updates do it.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- The $15 cut, distributed: $5 into the crate (25 -> 30), $10 into freight,
-- and margin_usd back to 0 so it isn't charged twice.
update public.monitor_settings set
  usd_to_kes  = 135,
  crate_usd   = 30,
  freight_usd = 10,
  margin_usd  = 0,
  updated_at  = now()
where id = 1;

-- Freight for the two large sizes.
update public.monitor_shipping set shipping_kes = 14200, updated_at = now() where size_group = '40';
update public.monitor_shipping set shipping_kes = 18700, updated_at = now() where size_group = '49';

-- ── Check the result ─────────────────────────────────────────────────────────
-- Expect: 135 | 3 | 30 | 10 | 0 | 1900
select usd_to_kes, alibaba_pct, crate_usd, freight_usd, margin_usd, config_markup_kes
from public.monitor_settings where id = 1;

-- Expect a figure against every size, none null.
select size_group, shipping_kes from public.monitor_shipping order by shipping_kes;

-- Spot-check a price the page should now show for the 27" 1080p 100Hz
-- (HP-Z2701CF, factory $67.50): KES 24,000.
select
  m.model_code,
  m.factory_usd,
  ceil((
    (m.factory_usd
      + m.factory_usd * s.alibaba_pct / 100
      + s.crate_usd + s.freight_usd + s.margin_usd
      + case when m.refresh_hz >= 165 then s.speakers_high_usd else s.speakers_low_usd end
      + s.rgb_usd
      + case when m.base_type = 'Fixed' then s.adj_base_usd else 0 end
      + s.cert_adapter_usd
    ) * s.usd_to_kes + sh.shipping_kes
  ) / 100) * 100 as expected_kes
from public.monitor_models m
cross join public.monitor_settings s
join public.monitor_shipping sh on sh.size_group = '27'
where m.model_code = 'HP-Z2701CF';
