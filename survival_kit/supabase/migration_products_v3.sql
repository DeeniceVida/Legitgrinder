-- Add price_kes column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_kes NUMERIC;

-- Relax constraints for general inventory support
ALTER TABLE products ALTER COLUMN brand DROP NOT NULL;
ALTER TABLE products ALTER COLUMN series DROP NOT NULL;
ALTER TABLE products ALTER COLUMN capacities DROP NOT NULL;

-- Ensure image column exists and is used consistently
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image') THEN
    ALTER TABLE products ADD COLUMN image TEXT;
  END IF;
END $$;
