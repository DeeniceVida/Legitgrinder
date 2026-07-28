-- ============================================================================
--  Group buys: colour options a buyer picks when reserving
--  Run once in the Supabase SQL editor. Safe to re-run.
--
--  Colours are purely a CHOICE — they never change the price. The gallery
--  (image_urls) stays for front/back/side shots of the item itself.
-- ============================================================================

-- Campaign: the list of colours on offer.
-- Shape: [{"name":"Gray","imageUrl":"https://…"}, {"name":"Black"}]
alter table public.group_campaigns
  add column if not exists colors jsonb;

-- Order: which colour this buyer chose.
alter table public.group_orders
  add column if not exists color text;


-- ── Record a reservation, now capturing the chosen colour ───────────────────
-- Dropped and recreated because the signature gains a parameter. p_color has a
-- default, so any older client build that omits it keeps working.
drop function if exists public.record_group_order(uuid, text, text, text, int, numeric, numeric, text);

create or replace function public.record_group_order(
  p_campaign_id uuid, p_client_name text, p_client_whatsapp text,
  p_client_email text, p_units int, p_total_kes numeric,
  p_amount_paid_kes numeric, p_paystack_reference text, p_color text default null
) returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  v_code := 'GRP-' || upper(substr(md5(random()::text), 1, 6));
  insert into public.group_orders
    (campaign_id, order_code, client_name, client_whatsapp, client_email,
     units, total_kes, amount_paid_kes, paystack_reference, color)
  values
    (p_campaign_id, v_code, p_client_name, p_client_whatsapp, p_client_email,
     p_units, p_total_kes, p_amount_paid_kes, p_paystack_reference, p_color);
  return v_code;
end; $$;

grant execute on function public.record_group_order(uuid, text, text, text, int, numeric, numeric, text, text) to anon, authenticated;
