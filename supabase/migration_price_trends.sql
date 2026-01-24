-- Add previous_price field to track price changes
ALTER TABLE product_variants ADD COLUMN previous_price_kes numeric;

-- Update existing rows to set previous = current (for initial state)
UPDATE product_variants SET previous_price_kes = price_kes WHERE price_kes IS NOT NULL;
