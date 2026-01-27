-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  joined_date DATE DEFAULT CURRENT_DATE,
  total_spent_kes NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_order_date TEXT DEFAULT 'Never',
  interests TEXT[] DEFAULT '{}',
  purchased_items TEXT[] DEFAULT '{}',
  purchase_frequency TEXT DEFAULT 'Low'
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (Anonymous management)
CREATE POLICY "Public read clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Public insert clients" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update clients" ON clients FOR UPDATE USING (true);
CREATE POLICY "Public delete clients" ON clients FOR DELETE USING (true);
