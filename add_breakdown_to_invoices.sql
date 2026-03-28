-- SQL script to add admin breakdown costs to invoices table.
-- You can run this in your Supabase SQL Editor.

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS buying_price_kes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fee_kes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS logistics_cost_kes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee_kes numeric DEFAULT 0;
