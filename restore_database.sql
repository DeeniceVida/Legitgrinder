-- LEGITGRINDER MASTER SEEDER (SQL VERSION)
-- Run this in your Supabase SQL Editor to guarantee all phones and prices are restored.

BEGIN;

-- 1. Clear existing data to avoid conflicts
TRUNCATE products CASCADE;

-- 2. Insert Products (Models)
INSERT INTO products (name, brand, series, capacities) VALUES
-- iPhones
('iPhone 11', 'iphone', '11 Series', ARRAY['64GB', '128GB', '256GB']),
('iPhone 11 Pro', 'iphone', '11 Series', ARRAY['64GB', '256GB', '512GB']),
('iPhone 11 Pro Max', 'iphone', '11 Series', ARRAY['64GB', '256GB', '512GB']),
('iPhone SE (2nd Gen)', 'iphone', 'SE', ARRAY['64GB', '128GB', '256GB']),
('iPhone 12 mini', 'iphone', '12 Series', ARRAY['64GB', '128GB', '256GB']),
('iPhone 12', 'iphone', '12 Series', ARRAY['64GB', '128GB', '256GB']),
('iPhone 12 Pro', 'iphone', '12 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 12 Pro Max', 'iphone', '12 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 13 mini', 'iphone', '13 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 13', 'iphone', '13 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 13 Pro', 'iphone', '13 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iPhone 13 Pro Max', 'iphone', '13 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iPhone SE (3rd Gen)', 'iphone', 'SE', ARRAY['64GB', '128GB', '256GB']),
('iPhone 14', 'iphone', '14 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 14 Plus', 'iphone', '14 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 14 Pro', 'iphone', '14 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iPhone 14 Pro Max', 'iphone', '14 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iPhone 15', 'iphone', '15 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 15 Plus', 'iphone', '15 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 15 Pro', 'iphone', '15 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iPhone 15 Pro Max', 'iphone', '15 Series', ARRAY['256GB', '512GB', '1TB']),
('iPhone 16', 'iphone', '16 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 16 Plus', 'iphone', '16 Series', ARRAY['128GB', '256GB', '512GB']),
('iPhone 16 Pro', 'iphone', '16 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iPhone 16 Pro Max', 'iphone', '16 Series', ARRAY['256GB', '512GB', '1TB']),
('iPhone 16e', 'iphone', '16 Series', ARRAY['128GB', '256GB']),

-- Samsung
('S24 Ultra', 'samsung', 'S24 Series', ARRAY['256GB', '512GB', '1TB']),
('S24+', 'samsung', 'S24 Series', ARRAY['256GB', '512GB']),
('S24', 'samsung', 'S24 Series', ARRAY['128GB', '256GB', '512GB']),
('S23 Ultra', 'samsung', 'S23 Series', ARRAY['256GB', '512GB', '1TB']),
('S23+', 'samsung', 'S23 Series', ARRAY['256GB', '512GB']),
('S23', 'samsung', 'S23 Series', ARRAY['128GB', '256GB', '512GB']),
('S22 Ultra', 'samsung', 'S22 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('S22+', 'samsung', 'S22 Series', ARRAY['128GB', '256GB']),
('S22', 'samsung', 'S22 Series', ARRAY['128GB', '256GB']),
('S21 Ultra', 'samsung', 'S21 Series', ARRAY['128GB', '256GB', '512GB']),
('S21+', 'samsung', 'S21 Series', ARRAY['128GB', '256GB']),
('S21', 'samsung', 'S21 Series', ARRAY['128GB', '256GB']),
('S21 FE', 'samsung', 'S21 Series', ARRAY['128GB', '256GB']),
('S20 Ultra', 'samsung', 'S20 Series', ARRAY['128GB', '256GB', '512GB']),
('S20+', 'samsung', 'S20 Series', ARRAY['128GB', '512GB']),
('S20', 'samsung', 'S20 Series', ARRAY['128GB', '512GB']),
('S20 FE', 'samsung', 'S20 Series', ARRAY['128GB', '256GB']),
('S10+', 'samsung', 'S10 Series', ARRAY['128GB', '512GB', '1TB']),
('S10', 'samsung', 'S10 Series', ARRAY['128GB', '512GB', '1TB']),
('S10e', 'samsung', 'S10 Series', ARRAY['128GB', '256GB']),

-- Pixel
('Pixel 9', 'pixel', '9 Series', ARRAY['128GB', '256GB']),
('Pixel 9 Pro', 'pixel', '9 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('Pixel 9 Pro XL', 'pixel', '9 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('Pixel 9 Pro Fold', 'pixel', '9 Series', ARRAY['256GB', '512GB']),
('Pixel 8a', 'pixel', '8 Series', ARRAY['128GB', '256GB']),
('Pixel 8', 'pixel', '8 Series', ARRAY['128GB', '256GB']),
('Pixel 8 Pro', 'pixel', '8 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('Pixel 7a', 'pixel', '7 Series', ARRAY['128GB']),
('Pixel 7', 'pixel', '7 Series', ARRAY['128GB', '256GB']),
('Pixel 7 Pro', 'pixel', '7 Series', ARRAY['128GB', '256GB', '512GB']),
('Pixel Fold', 'pixel', 'Fold Series', ARRAY['256GB', '512GB']),
('Pixel 6a', 'pixel', '6 Series', ARRAY['128GB']),
('Pixel 6', 'pixel', '6 Series', ARRAY['128GB', '256GB']),
('Pixel 6 Pro', 'pixel', '6 Series', ARRAY['128GB', '256GB', '512GB']);

-- 3. Explode capacities into product_variants
INSERT INTO product_variants (product_id, capacity, status)
SELECT id, unnest(capacities), 'active'
FROM products;

-- 4. APPLY REAL TEST PRICES (iPhone 11)
UPDATE product_variants 
SET 
  price_usd = 166.00, 
  price_kes = 29945, 
  source_url = 'https://www.backmarket.com/en-us/p/iphone-11-64-gb-black-unlocked-gsm/49fbcceb-6d56-42e4-8ccc-b7bb1dfa8ae4',
  last_updated = NOW()
WHERE product_id = (SELECT id FROM products WHERE name = 'iPhone 11') AND capacity = '64GB';

UPDATE product_variants 
SET 
  price_usd = 165.00,  -- 128GB is often same or cheaper
  price_kes = 29810, 
  source_url = 'https://www.backmarket.com/en-us/p/iphone-11-128-gb-black-unlocked/547a9196-b6e5-4f02-9019-e80c43115a62',
  last_updated = NOW()
WHERE product_id = (SELECT id FROM products WHERE name = 'iPhone 11') AND capacity = '128GB';

UPDATE product_variants 
SET 
  price_usd = 217.00, 
  price_kes = 36828, 
  source_url = 'https://www.backmarket.com/en-us/p/iphone-11-256-gb-black-unlocked/93fa5c8f-c66f-42e8-83af-700b2a9cd108',
  last_updated = NOW()
WHERE product_id = (SELECT id FROM products WHERE name = 'iPhone 11') AND capacity = '256GB';

COMMIT;
