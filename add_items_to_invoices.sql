-- Run this in your Supabase SQL Editor
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
