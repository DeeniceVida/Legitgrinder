-- ============================================================================
--  Variant prices become REAL prices instead of add-ons.
--
--  A variant's figure used to be added on top of the product's own price, so
--  a pegboard typed as 4,500 rang up at 6,500. From here the number typed
--  against "90 x 30cm Black" is what the customer pays.
--
--  NOTHING CHANGES PRICE. Every existing variant is rewritten as
--  (product price + its old add-on), which is exactly what the shop charges
--  today. Only the meaning of the stored number changes.
--
--  Safe to re-run: converted products are flagged and skipped, so prices can
--  never be inflated twice.
--
--  Run once in the Supabase SQL editor.
-- ============================================================================

alter table public.products
  add column if not exists variants_absolute boolean not null default false;

-- ── Have a look before you commit to it ─────────────────────────────────────
-- Uncomment to preview every variant: what it stores now, and what it becomes.
-- The "charges today" and "charges after" columns must be identical.
--
-- select p.name,
--        v->>'name'                                   as variant,
--        (v->>'priceKES')                             as stored_now,
--        coalesce(nullif(p.discount_price,0), p.price_kes)
--          + coalesce((v->>'priceKES')::numeric, 0)   as charges_today,
--        coalesce(nullif(p.discount_price,0), p.price_kes)
--          + coalesce((v->>'priceKES')::numeric, 0)   as charges_after
--   from public.products p,
--        lateral jsonb_array_elements(p.shop_variants) as v
--  where jsonb_typeof(p.shop_variants) = 'array'
--    and p.variants_absolute is not true
--  order by p.name, variant;

-- ── The conversion ──────────────────────────────────────────────────────────
-- A variant with no price of its own inherits the product price, because that
-- is precisely what a customer picking it pays today.
update public.products p
   set shop_variants = (
         select jsonb_agg(
                  jsonb_set(
                    elem,
                    '{priceKES}',
                    to_jsonb(
                      coalesce(nullif(p.discount_price, 0), p.price_kes, 0)
                      + coalesce((elem->>'priceKES')::numeric, 0)
                    )
                  )
                  order by ord
                )
           from jsonb_array_elements(p.shop_variants) with ordinality as t(elem, ord)
       ),
       variants_absolute = true
 where jsonb_typeof(p.shop_variants) = 'array'
   and jsonb_array_length(p.shop_variants) > 0
   and p.variants_absolute is not true;

-- Products without variants have nothing to convert, but still need flagging
-- so the shop treats any variant added later as a real price.
update public.products
   set variants_absolute = true
 where variants_absolute is not true;

-- Anything created from here on is absolute from birth.
alter table public.products alter column variants_absolute set default true;

-- ── After running this ──────────────────────────────────────────────────────
-- Every product charges exactly what it charged before. The one product you
-- wanted changed is the pegboard: open Admin → Stock → Pegboard and type the
-- real prices (90 x 30cm Black = 4500, and so on). They will now show exactly
-- as typed.
--
-- Worth a look while you are in there: "60 x 42cm Black" is stored as 65,
-- against 6,500 for the same size in white. It currently sells for KES 2,065.
