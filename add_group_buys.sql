-- Group Buys (bulk / pre-order campaigns). Run once in the Supabase SQL editor.
-- A campaign = one bulk item people deposit on. A group_order = one client's
-- reservation (their units + how much they've paid).

create table if not exists public.group_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique,                     -- short shareable code for the link
  title              text not null,
  description        text,
  image_url          text,
  unit_price_kes     numeric not null default 0,      -- all-inclusive price per unit
  min_deposit_kes    numeric not null default 0,      -- minimum deposit PER UNIT
  whatsapp_group_link text,
  status             text not null default 'open',    -- 'open' | 'closed'
  created_at         timestamptz default now()
);

create table if not exists public.group_orders (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid references public.group_campaigns(id) on delete cascade,
  order_code         text unique,                     -- e.g. GRP-A1B2C3 (client's confirmation)
  client_name        text,
  client_whatsapp    text,
  client_email       text,
  units              int not null default 1,
  total_kes          numeric not null default 0,      -- units * unit_price
  amount_paid_kes    numeric not null default 0,
  paystack_reference text,
  joined_group       boolean default false,
  created_at         timestamptz default now()
);

create index if not exists group_orders_campaign_idx on public.group_orders (campaign_id);

alter table public.group_campaigns enable row level security;
alter table public.group_orders   enable row level security;

-- Anyone can read a campaign (needed to render the public deposit page).
drop policy if exists "read campaigns" on public.group_campaigns;
create policy "read campaigns" on public.group_campaigns for select using (true);

-- Signed-in admin manages campaigns.
drop policy if exists "admin manage campaigns" on public.group_campaigns;
create policy "admin manage campaigns" on public.group_campaigns for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Only the signed-in admin can read the participant list.
drop policy if exists "admin read group orders" on public.group_orders;
create policy "admin read group orders" on public.group_orders for select
  using (auth.role() = 'authenticated');

-- Guests record their reservation through this function only (bypasses RLS safely).
create or replace function public.record_group_order(
  p_campaign_id uuid, p_client_name text, p_client_whatsapp text,
  p_client_email text, p_units int, p_total_kes numeric,
  p_amount_paid_kes numeric, p_paystack_reference text
) returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  v_code := 'GRP-' || upper(substr(md5(random()::text), 1, 6));
  insert into public.group_orders
    (campaign_id, order_code, client_name, client_whatsapp, client_email,
     units, total_kes, amount_paid_kes, paystack_reference)
  values
    (p_campaign_id, v_code, p_client_name, p_client_whatsapp, p_client_email,
     p_units, p_total_kes, p_amount_paid_kes, p_paystack_reference);
  return v_code;
end; $$;

create or replace function public.mark_group_order_joined(p_order_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.group_orders set joined_group = true where order_code = p_order_code;
end; $$;

grant execute on function public.record_group_order(uuid, text, text, text, int, numeric, numeric, text) to anon;
grant execute on function public.mark_group_order_joined(text) to anon;

-- ── Optional: a sample campaign so you can test the public page right away.
-- Edit the values, run it, then open /group/testbag on the live site.
-- insert into public.group_campaigns (slug, title, description, unit_price_kes, min_deposit_kes, whatsapp_group_link)
-- values ('testbag', 'Canvas Tote Bag (Group Buy)', 'Durable canvas tote, imported. Deposit to reserve yours.', 7000, 3700, 'https://chat.whatsapp.com/XXXXXXXX');
