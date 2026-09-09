-- ============================================================================
--  Set a monitor's buying price directly, without lying about what it cost.
--
--  Every monitor price is DERIVED: factory cost + crate + freight + inclusions
--  + margin, times the rate. That is the right default — change the exchange
--  rate once and 99 models reprice correctly.
--
--  But sometimes a price is simply decided. The owner set the four 49" models
--  by hand (2026-09-09), and none of them fall out of the formula.
--
--  The wrong way to honour that is to back-solve factory_usd until the formula
--  spits out the wanted number: it records a supplier cost that was never paid,
--  it makes the admin margin view lie, and the next time the exchange rate
--  moves the price silently drifts off the figure that was chosen.
--
--  So: an override. When set, it IS the buying price. Shipping and the service
--  fee are unaffected and still calculated as normal. factory_usd stays true,
--  so the real cost and the real margin remain visible.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.monitor_models
  add column if not exists buying_override_kes int;

comment on column public.monitor_models.buying_override_kes is
  'Buying price in KES, set by hand. When present it replaces the calculated goods price; shipping and service fee are unaffected. NULL means "use the formula".';


-- The owner's 49" list, 2026-09-09. These are BUYING prices — shipping
-- (KES 20,100 at 49") and the once-per-order service fee go on top.
--
-- Guarded on `is null` so re-running this file can never overwrite a price
-- later changed in the dashboard. An earlier migration clobbered a rate the
-- owner had set that way; every one since has been conditional.
update public.monitor_models set buying_override_kes = 56500
  where model_code = 'HP-4901-4K165' and buying_override_kes is null;
update public.monitor_models set buying_override_kes = 57900
  where model_code = 'HP-4901-5K120' and buying_override_kes is null;
update public.monitor_models set buying_override_kes = 60100
  where model_code = 'HP-4901-5K165' and buying_override_kes is null;
update public.monitor_models set buying_override_kes = 70100
  where model_code = 'HP-4901-5K240' and buying_override_kes is null;


-- ------------------------------------------------------------------
-- Ran clean? Want four rows, each showing the price set above.
-- ------------------------------------------------------------------
select model_code, res_label, refresh_hz, factory_usd, buying_override_kes
  from public.monitor_models
 where size_inches = 49
 order by sort_order;
