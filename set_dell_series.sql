-- ============================================================================
--  Label the D Series as Dell, and show it to buyers.
--
--  add_dell_models.sql stored these as "D Series" and kept the series name
--  internal. The owner has decided the Dell name should be visible on the
--  storefront, so this renames it and marks it public.
--
--  series_public controls whether a series name is shown to buyers at all. It
--  stays false for Victory / Golden Cudgel / MX, which are the factory's own
--  internal line names and mean nothing to a customer.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.monitor_models
  add column if not exists series_public boolean not null default false;

-- Rename, whichever label the rows currently carry.
update public.monitor_models
  set series = 'Dell'
  where series in ('D Series', 'Dell Model');

-- Dell is shown; every other series stays internal.
update public.monitor_models set series_public = true  where series = 'Dell';
update public.monitor_models set series_public = false where series is distinct from 'Dell';

-- ── Checks ──────────────────────────────────────────────────────────────────
-- Expect: Dell | 27 | t   and every other series with f
select series, count(*) as models, bool_or(series_public) as shown_to_buyers
from public.monitor_models
group by series order by series;

-- Expect 27 rows, all still switched off until you publish them.
select count(*) as dell_models, bool_or(is_active) as any_live
from public.monitor_models where series = 'Dell';
