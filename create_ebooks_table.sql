-- 11. EBOOKS
CREATE TABLE IF NOT EXISTS ebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  price_kes NUMERIC DEFAULT 0,
  discount_price_kes NUMERIC,
  cover_image TEXT,
  content TEXT, -- HTML content for online reading
  pdf_url TEXT, -- Link to PDF version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. EBOOK PURCHASES
CREATE TABLE IF NOT EXISTS ebook_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE ebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view ebooks" ON ebooks FOR SELECT USING (true);
CREATE POLICY "Admin can manage ebooks" ON ebooks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

ALTER TABLE ebook_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON ebook_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow system insert on purchase" ON ebook_purchases FOR INSERT WITH CHECK (true);
