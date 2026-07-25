-- ============================================================================
--  LegitGrinder — "Notify me when back in stock" waitlist
--  Run this ONCE in the Supabase SQL editor. Idempotent (safe to re-run).
--
--  Shoppers viewing an out-of-stock item leave their email; when you restock it
--  in the dashboard, they're auto-emailed that it's back — hurry before it's gone.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stock_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz            -- set when we've emailed them (they drop off the list)
);

-- One PENDING signup per product+email (a person can re-join after being notified).
CREATE UNIQUE INDEX IF NOT EXISTS stock_notif_pending_uniq
  ON public.stock_notifications (product_id, lower(email))
  WHERE notified_at IS NULL;

-- Fast lookup of who's waiting on a product.
CREATE INDEX IF NOT EXISTS stock_notif_product_idx
  ON public.stock_notifications (product_id) WHERE notified_at IS NULL;

ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Guests can add themselves to a waitlist (insert only — they can't read the list).
DROP POLICY IF EXISTS "anyone can join stock waitlist" ON public.stock_notifications;
CREATE POLICY "anyone can join stock waitlist" ON public.stock_notifications
  FOR INSERT WITH CHECK (true);

-- Admin can read / update / delete the waitlist (to email them and mark done).
DROP POLICY IF EXISTS "admin manages stock waitlist" ON public.stock_notifications;
CREATE POLICY "admin manages stock waitlist" ON public.stock_notifications
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
--  Done. New signups land here; restocking a product in the dashboard emails
--  the pending list and stamps notified_at.
-- ============================================================================
