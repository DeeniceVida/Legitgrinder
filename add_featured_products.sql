-- Featured products for the Shop promotional carousel.
-- Run ONCE in Supabase Dashboard → SQL Editor.
-- Mark a product as featured with the star toggle in Admin → Stock;
-- featured products auto-appear in the rotating banner at the top of /shop.

alter table public.products add column if not exists is_featured boolean default false;
