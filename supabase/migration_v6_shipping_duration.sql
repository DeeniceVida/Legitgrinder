-- Add shipping_duration column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_duration TEXT;
