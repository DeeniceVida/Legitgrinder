-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  author TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT true
);

-- Enable RLS for blogs
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to blogs
CREATE POLICY "Public read access" ON blogs FOR SELECT USING (true);

-- Allow admin full access to blogs
CREATE POLICY "Admin full access" ON blogs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Update consultations table to support new flow
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending', -- pending, paid
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- We'll use existing 'status' column but rely on these values:
-- 'pending_approval' (Initial)
-- 'confirmed_waiting_payment' (Admin sent payment details)
-- 'paid_waiting_approval' (Client paid)
-- 'scheduled' (Final approval)
