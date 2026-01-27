-- Add Gallery and Description support to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}', -- Array of image URLs
ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'Import on Order', -- 'In Stock', 'Import on Order'
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';

-- Create table for specific variant availability if needed (optional for simple shop, but good for scale)
-- We already have product_variants for the scraper, we can reuse or extend.
-- For the SHOP, we might want simple JSON variants for colors/sizes if they don't need distinct scraping tracking.
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_variants JSONB DEFAULT '[]'; 

-- Marketing Support
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_spend DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'; -- e.g. ['vip', 'repeat_buyer']
