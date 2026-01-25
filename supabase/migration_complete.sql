-- Comprehensive migration to add ALL missing columns to products table
-- This ensures the schema matches the application requirements

-- Add category column (required for product categorization)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Products';

-- Add inventory and pricing columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;

-- Add variation and color arrays
ALTER TABLE products ADD COLUMN IF NOT EXISTS variations TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Create FAQs table if it doesn't exist
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for FAQs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "FAQs are viewable by everyone" ON faqs;
DROP POLICY IF EXISTS "Admins can manage faqs" ON faqs;

-- Create policies
CREATE POLICY "FAQs are viewable by everyone" ON faqs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage faqs" ON faqs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add client_whatsapp column to consultations if it doesn't exist
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS client_whatsapp TEXT;
