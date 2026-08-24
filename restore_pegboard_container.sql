-- ============================================================================
--  Put the containers back on the pegboard, as accessories.
--
--  Undoes split_pegboard_container.sql. The container is an accessory to the
--  board, not a product someone shops for on its own, so it belongs on the
--  board's page where a buyer can add one to their order.
--
--  What makes this work now, and did not before: the shop treats a "Bundle"
--  option as an ACCESSORY. It ADDS to the price rather than replacing it, and
--  it is optional — so a board is 4,500, a board with a container is 5,150,
--  and nobody is forced to pick a container to buy a board.
--
--  Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- ── Move the colours back as Bundle rows ────────────────────────────────────
update public.products peg
   set shop_variants = peg.shop_variants || coalesce((
         select jsonb_agg(
                  jsonb_build_object(
                    'type', 'Bundle',
                    'name', 'Container ' || (v->>'name'),
                    'priceKES', coalesce((v->>'priceKES')::numeric, 650),
                    'stockCount', coalesce((v->>'stockCount')::int, 0)
                  ) || case when v ? 'imageUrl' then jsonb_build_object('imageUrl', v->>'imageUrl') else '{}'::jsonb end
                )
           from public.products c,
                lateral jsonb_array_elements(c.shop_variants) v
          where c.name = 'Pegboard Container'
       ), '[]'::jsonb)
 where peg.name = 'Pegboard - Desk Organizer'
   -- Only if they aren't already there, so re-running can't duplicate them.
   and not exists (
         select 1 from jsonb_array_elements(peg.shop_variants) v where v->>'type' = 'Bundle'
       )
   and exists (select 1 from public.products where name = 'Pegboard Container');

-- ── Take the standalone product back out of the shop ────────────────────────
delete from public.products where name = 'Pegboard Container';

-- ── Keep the board's own stock figure honest ────────────────────────────────
-- Containers are accessories, so they should NOT inflate how many boards we
-- look to have. Count the sizes only.
update public.products
   set inventory_quantity = coalesce((
         select sum(coalesce((v->>'stockCount')::int, 0))
           from jsonb_array_elements(shop_variants) v
          where v->>'type' <> 'Bundle'
       ), 0)
 where name = 'Pegboard - Desk Organizer';

-- ── Check it ────────────────────────────────────────────────────────────────
-- select v->>'type' as type, v->>'name' as name, v->>'priceKES' as price, v->>'stockCount' as stock
--   from public.products p, lateral jsonb_array_elements(p.shop_variants) v
--  where p.name = 'Pegboard - Desk Organizer'
--  order by 1, 2;
--
-- Expect the sizes plus two Bundle rows at 650. On the shop the containers
-- appear under "Add Bundle — optional", each chip showing "+KES 650", and the
-- total goes up only when one is chosen.
