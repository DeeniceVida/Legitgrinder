-- ============================================================================
--  A monitor may have a DECIDED price and no known supplier cost.
--
--  The 34" 165Hz is the first of these: neither quotation sheet carries that
--  model (34" goes 100 → 180 → 200 → 240HZ), so there is no factory price to
--  record. The column insisted on a number, and the only numbers available
--  would have been invented — which is exactly what the override mechanism
--  exists to avoid. A made-up cost makes the margin view lie and quietly
--  drifts the price at the next exchange-rate change.
--
--  factory_usd may now be empty. A model with no cost AND no decided price
--  cannot be priced at all, and the code refuses to quote it rather than
--  pricing it as if the panel were free.
--
--  Nothing existing changes: every current model keeps its cost.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.monitor_models alter column factory_usd drop not null;

comment on column public.monitor_models.factory_usd is
  'Supplier price per unit, USD. Empty when we have no quoted cost — then buying_override_kes must carry the price. Never back-solve this to hit a wanted price.';

-- ------------------------------------------------------------------
-- Ran clean? Want: cost_optional = YES, models_without_cost = 0.
-- ------------------------------------------------------------------
select
  case when is_nullable = 'YES' then 'YES' else 'still required' end as cost_optional,
  (select count(*) from public.monitor_models where factory_usd is null) as models_without_cost
from information_schema.columns
where table_schema = 'public' and table_name = 'monitor_models' and column_name = 'factory_usd';
