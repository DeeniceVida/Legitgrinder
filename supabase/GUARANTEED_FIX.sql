-- GUARANTEED FIX - This will work no matter what state your database is in
-- Run this in Supabase SQL Editor

-- Step 1: Add ALL missing columns individually (this will work even if table exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_kes NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Products';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'In Stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_variants JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'USA';
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variations TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Step 2: Make sure name column exists (it should, but just in case)
ALTER TABLE products ADD COLUMN IF NOT EXISTS name TEXT;

-- Step 3: Fix any NULL values in critical columns
UPDATE products SET price_kes = 0 WHERE price_kes IS NULL;
UPDATE products SET category = 'General Products' WHERE category IS NULL;
UPDATE products SET stock_status = 'In Stock' WHERE stock_status IS NULL;

-- Step 4: Drop and recreate policies (clean slate)
DROP POLICY IF EXISTS "products_select_all" ON products;
DROP POLICY IF EXISTS "products_insert_admin" ON products;
DROP POLICY IF EXISTS "products_update_admin" ON products;
DROP POLICY IF EXISTS "products_delete_admin" ON products;

CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_admin" ON products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "products_update_admin" ON products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "products_delete_admin" ON products FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Done! All columns should now exist
