-- EMERGENCY FIX: Allow anonymous (public) management of products
-- This is necessary because the current site uses a mock login that doesn't authenticate with Supabase Auth.

-- 1. Drop existing tight policies
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Everyone can view products" ON products;

-- 2. Create wide-open policies for public use (Temporary Fix)
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete products" ON products FOR DELETE USING (true);

-- 3. Also ensure variants are open if needed
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read variants" ON product_variants;
CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public manages variants" ON product_variants;
CREATE POLICY "Public manages variants" ON product_variants FOR ALL USING (true);
