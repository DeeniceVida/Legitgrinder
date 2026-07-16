-- Logistics / tracking columns for the tracking agent.
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS).

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS origin              text,          -- 'China' | 'US-UK'
  ADD COLUMN IF NOT EXISTS inland_tracking     text,          -- domestic tracking number
  ADD COLUMN IF NOT EXISTS container_number    text,          -- China → Mombasa sea container
  ADD COLUMN IF NOT EXISTS internal_status     text,          -- hidden InternalStatus value
  ADD COLUMN IF NOT EXISTS est_arrival         date,          -- estimated Kenya arrival
  ADD COLUMN IF NOT EXISTS mombasa_arrived_at  timestamptz;   -- port arrival → drives grace period

-- Helpful indexes for grouping/lookups (optional but cheap).
CREATE INDEX IF NOT EXISTS invoices_container_number_idx ON public.invoices (container_number);
CREATE INDEX IF NOT EXISTS invoices_internal_status_idx  ON public.invoices (internal_status);
