-- Fix RLS policies for product_variants to allow admin updates
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON product_variants;
DROP POLICY IF EXISTS "Allow admin updates" ON product_variants;

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (for public pricelist)
CREATE POLICY "Allow public read access" ON product_variants
  FOR SELECT USING (true);

-- Allow admins to update (for scraper URL and price adjustments)
CREATE POLICY "Allow admin updates" ON product_variants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to insert
CREATE POLICY "Allow admin inserts" ON product_variants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
