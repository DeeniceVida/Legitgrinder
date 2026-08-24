-- ============================================================================
--  The pegboard container becomes its own product.
--
--  It was sitting on the pegboard as a "Bundle" option, which forced two
--  awkward things: you had to pick a container before you could buy a board,
--  and a board bought WITH a container charged the board price only — the
--  container went out free.
--
--  It is not an option, it is a separate thing someone buys. So it becomes a
--  product: buy a board, buy a container, or buy both, each counted properly.
--
--  Run AFTER add_absolute_variant_pricing.sql. Safe to re-run.
-- ============================================================================

-- ── The new product, priced and stocked from the rows it came from ──────────
insert into public.products
  (name, price_kes, category, stock_status, inventory_quantity,
   description, image, images, shop_variants, shipping_duration, variants_absolute)
select
  'Pegboard Container',
  650,
  peg.category,
  peg.stock_status,
  -- Everything the two colours held between them.
  coalesce((
    select sum(coalesce((v->>'stockCount')::int, 0))
      from jsonb_array_elements(peg.shop_variants) v
     where v->>'type' = 'Bundle'
  ), 0),
  'Clip-on storage container for the pegboard desk organiser — holds pens, cables and small tools. Fits any of our pegboard sizes.',
  peg.image,
  peg.images,
  -- Colour becomes the option, each carrying its own price and stock.
  coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'type', 'Color',
               'name', replace(v->>'name', 'Container ', ''),
               'priceKES', coalesce((v->>'priceKES')::numeric, 650),
               'stockCount', coalesce((v->>'stockCount')::int, 0)
             ) || case when v ? 'imageUrl' then jsonb_build_object('imageUrl', v->>'imageUrl') else '{}'::jsonb end
           )
      from jsonb_array_elements(peg.shop_variants) v
     where v->>'type' = 'Bundle'
  ), '[]'::jsonb),
  peg.shipping_duration,
  true
from public.products peg
where peg.name = 'Pegboard - Desk Organizer'
  and not exists (select 1 from public.products where name = 'Pegboard Container');

-- ── Take the Bundle rows off the pegboard ───────────────────────────────────
update public.products
   set shop_variants = coalesce((
         select jsonb_agg(v order by ord)
           from jsonb_array_elements(shop_variants) with ordinality as t(v, ord)
          where v->>'type' <> 'Bundle'
       ), '[]'::jsonb)
 where name = 'Pegboard - Desk Organizer'
   and exists (
         select 1 from jsonb_array_elements(shop_variants) v where v->>'type' = 'Bundle'
       );

-- ── Stock the pegboard itself ───────────────────────────────────────────────
-- Its product-level count sat at 0 while the sizes held pieces, and the shop
-- reads that field to decide whether anything can be bought at all — so the
-- board was showing as out of stock with thirty pieces on the shelf. The code
-- now falls back to the sum of the options, but setting the real figure keeps
-- the dashboard honest too.
update public.products
   set inventory_quantity = coalesce((
         select sum(coalesce((v->>'stockCount')::int, 0))
           from jsonb_array_elements(shop_variants) v
       ), 0)
 where name = 'Pegboard - Desk Organizer'
   and coalesce(inventory_quantity, 0) = 0;

-- ── Check it ────────────────────────────────────────────────────────────────
-- select name, price_kes, inventory_quantity, jsonb_array_length(shop_variants) as options
--   from public.products
--  where name in ('Pegboard - Desk Organizer', 'Pegboard Container');
--
-- The container will want its own photo — Admin → Stock → Pegboard Container.
