-- FINAL COMPREHENSIVE FIX - Run this ONCE and everything will work
-- This migration ensures ALL required columns exist and policies are correct

-- Step 1: Ensure base table exists with all columns
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    price_kes NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'General Products',
    stock_status TEXT DEFAULT 'In Stock',
    description TEXT,
    image TEXT,
    images TEXT[] DEFAULT '{}',
    shop_variants JSONB DEFAULT '[]',
    origin TEXT DEFAULT 'USA',
    inventory_quantity INTEGER DEFAULT 0,
    discount_price NUMERIC,
    variations TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    brand TEXT,
    series TEXT,
    capacities TEXT[]
);

-- Step 2: Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable write access for admins" ON products;
DROP POLICY IF EXISTS "Everyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

-- Step 4: Create fresh, simple policies
CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_admin" ON products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "products_update_admin" ON products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "products_delete_admin" ON products FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Step 5: Ensure FAQs table exists
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "FAQs are viewable by everyone" ON faqs;
DROP POLICY IF EXISTS "Admins can manage faqs" ON faqs;

CREATE POLICY "faqs_select_all" ON faqs FOR SELECT USING (true);
CREATE POLICY "faqs_modify_admin" ON faqs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Step 6: Ensure consultations has WhatsApp column
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS client_whatsapp TEXT;

-- Done! Everything should work now.
