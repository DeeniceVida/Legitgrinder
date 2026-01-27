-- Create orders table for client order history
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT NOT NULL,
  client_location TEXT,
  product_name TEXT NOT NULL,
  product_url TEXT,
  buying_price_kes NUMERIC NOT NULL,
  shipping_fee_kes NUMERIC NOT NULL,
  service_fee_kes NUMERIC NOT NULL,
  total_cost_kes NUMERIC NOT NULL,
  status TEXT DEFAULT 'Received by Agent',
  mode TEXT DEFAULT 'Air',
  origin TEXT DEFAULT 'USA',
  date_placed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT FALSE,
  weight_kg NUMERIC,
  dimensions TEXT,
  tracking_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert orders" ON orders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
