-- Automatic stock deduction on successful website purchase
-- Run this ONCE in Supabase Dashboard → SQL Editor.
--
-- Guests (anon role) cannot update the products table directly (RLS blocks it,
-- which is correct). This SECURITY DEFINER function is the single, safe gate:
-- it can ONLY decrement stock, never set arbitrary values, and never below 0.

create or replace function public.decrement_product_stock(p_product_id uuid, p_qty int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_qty int;
begin
  if p_qty is null or p_qty <= 0 then
    select inventory_quantity into new_qty from products where id = p_product_id;
    return coalesce(new_qty, 0);
  end if;

  update products
  set inventory_quantity = greatest(coalesce(inventory_quantity, 0) - p_qty, 0)
  where id = p_product_id
  returning inventory_quantity into new_qty;

  return coalesce(new_qty, 0);
end;
$$;

-- Allow the website (anon) and logged-in users to call it
grant execute on function public.decrement_product_stock(uuid, int) to anon, authenticated;
