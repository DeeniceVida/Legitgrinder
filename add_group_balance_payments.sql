-- ============================================================================
--  Group buys: mark a campaign ARRIVED and let buyers pay their balance online
--  Run once in the Supabase SQL editor. Safe to re-run.
--
--  Flow: admin clicks "Arrived" → every buyer with a balance is emailed a pay
--  link → they pay via Paystack → the roster flips to Paid automatically.
-- ============================================================================

alter table public.group_campaigns
  add column if not exists arrived_at timestamptz;   -- when stock landed / balances were called in

alter table public.group_orders
  add column if not exists balance_paid_at    timestamptz,
  add column if not exists balance_reference  text;


-- ── Public: read ONE order by its code (for the pay page) ───────────────────
-- group_orders is admin-only under RLS, so the pay page reads through this
-- function. It deliberately returns NO phone or email — only what's needed to
-- show the buyer their balance and charge it.
create or replace function public.get_group_order(p_code text)
returns table (
  order_code      text,
  client_name     text,
  campaign_title  text,
  units           int,
  color           text,
  total_kes       numeric,
  amount_paid_kes numeric,
  balance_kes     numeric,
  arrived         boolean
)
language sql
security definer
set search_path = public
as $$
  select o.order_code,
         o.client_name,
         c.title,
         o.units,
         o.color,
         o.total_kes,
         o.amount_paid_kes,
         greatest(coalesce(o.total_kes,0) - coalesce(o.amount_paid_kes,0), 0),
         (c.arrived_at is not null)
  from public.group_orders o
  join public.group_campaigns c on c.id = o.campaign_id
  where lower(o.order_code) = lower(btrim(coalesce(p_code,'')))
  limit 1;
$$;

revoke all on function public.get_group_order(text) from public;
grant execute on function public.get_group_order(text) to anon, authenticated;


-- ── Public: record a balance payment against the buyer's own order ──────────
-- Adds to amount_paid_kes and never lets it exceed the order total.
create or replace function public.record_group_balance_payment(
  p_code text, p_amount numeric, p_reference text
)
returns table (order_code text, amount_paid_kes numeric, balance_kes numeric, fully_paid boolean)
language plpgsql
security definer
set search_path = public
as $$
declare v public.group_orders%rowtype;
begin
  select * into v from public.group_orders
   where lower(order_code) = lower(btrim(coalesce(p_code,''))) limit 1;
  if not found then return; end if;

  update public.group_orders set
    amount_paid_kes   = least(coalesce(amount_paid_kes,0) + greatest(coalesce(p_amount,0),0), coalesce(total_kes,0)),
    balance_reference = coalesce(p_reference, balance_reference),
    balance_paid_at   = case
                          when coalesce(amount_paid_kes,0) + greatest(coalesce(p_amount,0),0) >= coalesce(total_kes,0)
                          then now() else balance_paid_at end
  where id = v.id;

  return query
    select o.order_code, o.amount_paid_kes,
           greatest(coalesce(o.total_kes,0) - coalesce(o.amount_paid_kes,0), 0),
           coalesce(o.amount_paid_kes,0) >= coalesce(o.total_kes,0)
    from public.group_orders o where o.id = v.id;
end; $$;

revoke all on function public.record_group_balance_payment(text, numeric, text) from public;
grant execute on function public.record_group_balance_payment(text, numeric, text) to anon, authenticated;
