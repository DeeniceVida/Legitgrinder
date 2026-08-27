-- ============================================================================
--  Receipts for sales that never touched the website.
--
--  An item sold off-platform still needs a receipt, and a receipt for
--  something being delivered has to say where it is going. Orders had nowhere
--  to record that, so it lived in WhatsApp and nowhere else.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.invoices
  add column if not exists delivery_note text;

comment on column public.invoices.delivery_note is
  'Free text printed on the invoice/receipt — delivery address, pickup arrangement, or any condition of the sale.';
