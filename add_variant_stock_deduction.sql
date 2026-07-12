-- Per-variant stock deduction (sizes / colors / designs)
-- Run ONCE in Supabase Dashboard → SQL Editor (after add_stock_deduction.sql).
--
-- Products store variants as a JSONB array in `shop_variants`
-- (e.g. [{"type":"Color","name":"Black","priceKES":0,"stockCount":3}, …]).
-- This function decrements ONE variant's stockCount (never below 0) and also
-- decrements the product's overall inventory_quantity, atomically.

create or replace function public.decrement_variant_stock(
  p_product_id uuid,
  p_variant_type text,
  p_variant_name text,
  p_qty int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variants jsonb;
  v_new jsonb := '[]'::jsonb;
  v_item jsonb;
  v_touched boolean := false;
begin
  if p_qty is null or p_qty <= 0 then
    select shop_variants into v_variants from products where id = p_product_id;
    return coalesce(v_variants, '[]'::jsonb);
  end if;

  select shop_variants into v_variants from products where id = p_product_id for update;
  if v_variants is null or jsonb_typeof(v_variants) <> 'array' then
    -- No variants — fall back to product-level deduction only
    update products
    set inventory_quantity = greatest(coalesce(inventory_quantity, 0) - p_qty, 0)
    where id = p_product_id;
    return '[]'::jsonb;
  end if;

  for v_item in select * from jsonb_array_elements(v_variants) loop
    if not v_touched
       and coalesce(v_item->>'type', 'Other') = p_variant_type
       and v_item->>'name' = p_variant_name
       and v_item ? 'stockCount' then
      v_item := jsonb_set(
        v_item,
        '{stockCount}',
        to_jsonb(greatest(coalesce((v_item->>'stockCount')::int, 0) - p_qty, 0))
      );
      v_touched := true;
    end if;
    v_new := v_new || jsonb_build_array(v_item);
  end loop;

  update products
  set shop_variants = v_new,
      inventory_quantity = greatest(coalesce(inventory_quantity, 0) - p_qty, 0)
  where id = p_product_id;

  return v_new;
end;
$$;

grant execute on function public.decrement_variant_stock(uuid, text, text, int) to anon, authenticated;
