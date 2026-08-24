-- ============================================================================
--  WhatsApp enquiries — so stock stays honest when a sale happens off-site.
--
--  Someone taps "Order via WhatsApp" on a product and the conversation moves
--  to your phone. Whatever happens next, the shop never hears about it, so
--  stock silently drifts out of date. This records the enquiry the moment it
--  leaves the site, and the dashboard asks you a day later whether it turned
--  into a sale — one tap to deduct the stock, one to close it.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

create table if not exists public.product_enquiries (
  id             uuid primary key default gen_random_uuid(),
  product_id     text,                        -- kept as text: ids are stringified app-side
  product_name   text not null,               -- snapshotted, so a renamed or deleted product still reads
  variant        text,                        -- "Size: 90 x 30cm Black"
  quantity       int not null default 1,
  unit_price_kes numeric,                     -- what the shop quoted at that moment
  status         text not null default 'open',   -- open | bought | lost
  admin_notes    text,
  /** When it was answered, and how it went. */
  resolved_at    timestamptz,
  /** Set when marking it bought, so stock is never deducted twice. */
  stock_adjusted boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists product_enquiries_status_idx
  on public.product_enquiries (status, created_at desc);

alter table public.product_enquiries enable row level security;

-- Shoppers are anonymous, so the insert has to be open. Nothing is read back:
-- only an admin can list enquiries, so one customer can never see another's.
drop policy if exists "anyone logs an enquiry" on public.product_enquiries;
create policy "anyone logs an enquiry" on public.product_enquiries
  for insert with check (true);

drop policy if exists "admin manages enquiries" on public.product_enquiries;
create policy "admin manages enquiries" on public.product_enquiries
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
