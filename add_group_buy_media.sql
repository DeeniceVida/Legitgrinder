-- ============================================================================
--  Group buys: multiple images + a video link (TikTok / YouTube / Instagram)
--  Run once in the Supabase SQL editor. Idempotent — safe to re-run.
--
--  The existing single `image_url` stays for older campaigns; the public page
--  falls back to it when `image_urls` is empty.
-- ============================================================================

alter table public.group_campaigns
  add column if not exists image_urls text[],   -- gallery, first one is the cover
  add column if not exists video_url  text,     -- TikTok / YouTube / Instagram link
  add column if not exists shipping_mode text default 'air';  -- 'air' | 'sea' — drives the ETA shown on the poster

-- Backfill the gallery from the old single image so existing campaigns keep working.
update public.group_campaigns
   set image_urls = array[image_url]
 where image_url is not null
   and image_url <> ''
   and (image_urls is null or cardinality(image_urls) = 0);
