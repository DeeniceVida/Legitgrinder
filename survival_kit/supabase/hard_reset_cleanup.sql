
-- 🧹 Database Hard Reset & Cleanup
-- Run this in your Supabase SQL Editor to clear the messy data.

-- 1. Remove all products that were NOT part of the calculated pricelist
-- (Calculated phones usually have category 'Phone' or brands 'iphone', 'samsung', 'pixel')
DELETE FROM products 
WHERE category != 'Phone' 
OR brand NOT IN ('iphone', 'samsung', 'pixel');

-- 2. Clear any orphaned variants (if any)
DELETE FROM product_variants 
WHERE product_id NOT IN (SELECT id FROM products);

-- 3. Ensure your main account is always an admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'mungaimports@gmail.com';

-- 4. Clear any generic scraper logs
DELETE FROM scraper_logs WHERE created_at < NOW() - INTERVAL '1 day';

-- ✅ Your database is now clean and synchronized with the new stable UI.
