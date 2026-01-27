-- Add missing category column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Products';

-- Ensure all required columns for general items exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_kes NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'In Stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_variants JSONB DEFAULT '[]';

-- Relax constraints to allow non-phone items
ALTER TABLE products ALTER COLUMN brand DROP NOT NULL;
ALTER TABLE products ALTER COLUMN series DROP NOT NULL;
ALTER TABLE products ALTER COLUMN capacities DROP NOT NULL;

-- Enable RLS (already enabled but policies needed)
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
