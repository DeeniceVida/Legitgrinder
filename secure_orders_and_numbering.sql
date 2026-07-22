-- ============================================================================
--  LegitGrinder — collision-proof order numbers + invoice privacy hardening
--  Run this ONCE in the Supabase SQL editor (Project → SQL Editor → New query),
--  logged in as the project owner. Every statement is idempotent (safe to re-run).
--
--  WHAT IT DOES
--   1) New orders get a clean, sequential number: LG100001, LG100002, …
--      A Postgres sequence is atomic, so two orders can NEVER share a number,
--      even if created in the same millisecond. No dashes, no #, easy to type.
--   2) Locks the `invoices` table so the public key can no longer read customer
--      data. Public order tracking and the pay page keep working through two
--      narrow, safe functions that expose only the fields they need.
-- ============================================================================


-- ── 1. SEQUENTIAL ORDER NUMBERS ─────────────────────────────────────────────
-- Existing orders keep their old "INV-…" numbers; this only affects new ones.
-- Starts at 100001 so new numbers never collide with the historical set.
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  AS BIGINT START WITH 100001 INCREMENT BY 1 MINVALUE 100001;

-- Formats the next value as "LG100001".
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE sql
AS $$ SELECT 'LG' || nextval('public.order_number_seq')::text $$;

-- Fill invoice_number automatically whenever the app doesn't supply one.
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR btrim(NEW.invoice_number) = '' THEN
    NEW.invoice_number := public.next_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_order_number ON public.invoices;
CREATE TRIGGER trg_assign_order_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();


-- ── 1b. REVIEW TRACKING ─────────────────────────────────────────────────────
-- Remembers when the admin sent a delivered client the review request, so the
-- dashboard can show a "To review" list (delivered orders not yet asked).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;


-- ── 2. LOCK DOWN THE INVOICES TABLE ─────────────────────────────────────────
-- Today the anonymous (public) key can read EVERY invoice — names, phone
-- numbers, amounts. We drop all existing policies and recreate a strict set.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'invoices'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', p.policyname);
  END LOOP;
END $$;

-- Admin (role = 'admin' in profiles): full read/write access.
CREATE POLICY "Admins full access to invoices" ON public.invoices
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Signed-in customer: can read ONLY their own orders.
CREATE POLICY "Users read own orders" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone (incl. guest shop checkout) can create an order.
CREATE POLICY "Anyone can create an order" ON public.invoices
  FOR INSERT WITH CHECK (true);

-- NOTE: there is deliberately NO public SELECT policy. Guests read order data
-- only through the two SECURITY DEFINER functions below, which pick safe columns.


-- ── 3. PUBLIC ORDER TRACKING (status only, zero PII) ────────────────────────
-- Matches an order number OR paystack/logistics tracking code, forgiving of the
-- IG-/LG-/INV- display prefixes, a leading #, case, and trailing punctuation.
CREATE OR REPLACE FUNCTION public.track_order(code text)
RETURNS TABLE (
  invoice_number text,
  product_name   text,
  status         text,
  progress       int,
  last_update    timestamptz,
  created_at     timestamptz,
  currency       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH n AS (
    SELECT
      btrim(regexp_replace(regexp_replace(lower(coalesce(code,'')), '[%_]', '', 'g'),
                           '[.,\s]+$', '')) AS raw
  ), m AS (
    SELECT
      raw,
      regexp_replace(raw, '^#', '')                                   AS no_hash,
      regexp_replace(regexp_replace(raw, '^#', ''), '^(ig|lg|inv)-', '') AS bare
    FROM n
  )
  SELECT i.invoice_number, i.product_name, i.status, i.progress,
         i.last_update, i.created_at, i.currency
  FROM public.invoices i, m
  WHERE m.raw <> '' AND (
        lower(i.invoice_number)   = m.raw
     OR lower(i.invoice_number)   = m.no_hash
     OR lower(i.invoice_number)   = m.bare
     OR lower(i.invoice_number)   LIKE '%' || m.bare       -- bare "100001" ⇢ "LG100001"
     OR lower(i.paystack_reference) = m.raw
     OR lower(i.paystack_reference) = m.bare
  )
  ORDER BY i.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.track_order(text) FROM public;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;


-- ── 4. PUBLIC PAY PAGE (minimum needed to take payment) ─────────────────────
-- Pay links (/pay/<number>) are opened by the specific customer, so this can
-- return the amount owed and the name — but NOT phone, email, or cost breakdown.
CREATE OR REPLACE FUNCTION public.get_payable_invoice(code text)
RETURNS TABLE (
  id             uuid,
  invoice_number text,
  client_name    text,
  product_name   text,
  quantity       int,
  total_kes      numeric,
  amount_paid_kes numeric,
  currency       text,
  is_paid        boolean,
  payment_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.invoice_number, i.client_name, i.product_name, i.quantity,
         i.total_kes, i.amount_paid_kes, i.currency, i.is_paid, i.payment_status
  FROM public.invoices i
  WHERE lower(i.invoice_number)   = lower(btrim(coalesce(code,'')))
     OR lower(i.paystack_reference) = lower(btrim(coalesce(code,'')))
  ORDER BY i.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_payable_invoice(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_payable_invoice(text) TO anon, authenticated;

-- (Recording a pay-link payment already goes through your existing
--  `record_invoice_payment` RPC, which is unaffected by this lockdown.)

-- ============================================================================
--  Done. Quick checks you can run right after:
--    SELECT public.next_order_number();          -- ⇒ LG100001 (bumps each call)
--    SELECT * FROM public.track_order('100001'); -- ⇒ status row (once an order exists)
-- ============================================================================
