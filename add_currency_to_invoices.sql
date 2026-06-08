-- Add currency column to invoices table if it doesn't exist
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';

-- Add currency column to product_variants table if it doesn't exist (Optional, for consistency)
-- ALTER TABLE public.product_variants
-- ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KES';

-- Ensure existing rows have a default value
UPDATE public.invoices 
SET currency = 'KES' 
WHERE currency IS NULL;
