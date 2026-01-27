-- Migration: Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  topic TEXT,
  status TEXT DEFAULT 'Pending Review',
  fee_usd NUMERIC DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable insert for everyone" ON consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable view for admins" ON consultations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
CREATE POLICY "Enable update for admins" ON consultations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
