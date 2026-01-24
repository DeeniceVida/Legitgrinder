-- Add missing columns to products table if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'In Stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'USA';

-- Update existing products to have default values
UPDATE products SET stock_status = 'In Stock' WHERE stock_status IS NULL;
UPDATE products SET origin = 'USA' WHERE origin IS NULL;
