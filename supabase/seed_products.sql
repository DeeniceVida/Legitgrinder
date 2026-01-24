-- Insert Phone Models
-- This SQL is generated based on constants.ts

-- iPhone
INSERT INTO products (brand, name, series, capacities) VALUES
('iphone', 'iPhone 11', '11 Series', ARRAY['64GB', '128GB', '256GB']),
('iphone', 'iPhone 11 Pro', '11 Series', ARRAY['64GB', '256GB', '512GB']),
('iphone', 'iPhone 11 Pro Max', '11 Series', ARRAY['64GB', '256GB', '512GB']),
('iphone', 'iPhone SE (2nd Gen)', 'SE', ARRAY['64GB', '128GB', '256GB']),
('iphone', 'iPhone 12 mini', '12 Series', ARRAY['64GB', '128GB', '256GB']),
('iphone', 'iPhone 12', '12 Series', ARRAY['64GB', '128GB', '256GB']),
('iphone', 'iPhone 12 Pro', '12 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 12 Pro Max', '12 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 13 mini', '13 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 13', '13 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 13 Pro', '13 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iphone', 'iPhone 13 Pro Max', '13 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iphone', 'iPhone SE (3rd Gen)', 'SE', ARRAY['64GB', '128GB', '256GB']),
('iphone', 'iPhone 14', '14 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 14 Plus', '14 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 14 Pro', '14 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iphone', 'iPhone 14 Pro Max', '14 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iphone', 'iPhone 15', '15 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 15 Plus', '15 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 15 Pro', '15 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iphone', 'iPhone 15 Pro Max', '15 Series', ARRAY['256GB', '512GB', '1TB']),
('iphone', 'iPhone 16', '16 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 16 Plus', '16 Series', ARRAY['128GB', '256GB', '512GB']),
('iphone', 'iPhone 16 Pro', '16 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('iphone', 'iPhone 16 Pro Max', '16 Series', ARRAY['256GB', '512GB', '1TB']),
('iphone', 'iPhone 16e', '16 Series', ARRAY['128GB', '256GB']);

-- Samsung
INSERT INTO products (brand, name, series, capacities) VALUES
('samsung', 'S24 Ultra', 'S24 Series', ARRAY['256GB', '512GB', '1TB']),
('samsung', 'S24+', 'S24 Series', ARRAY['256GB', '512GB']),
('samsung', 'S24', 'S24 Series', ARRAY['128GB', '256GB', '512GB']),
('samsung', 'S23 Ultra', 'S23 Series', ARRAY['256GB', '512GB', '1TB']),
('samsung', 'S23+', 'S23 Series', ARRAY['256GB', '512GB']),
('samsung', 'S23', 'S23 Series', ARRAY['128GB', '256GB', '512GB']),
('samsung', 'S22 Ultra', 'S22 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('samsung', 'S22+', 'S22 Series', ARRAY['128GB', '256GB']),
('samsung', 'S22', 'S22 Series', ARRAY['128GB', '256GB']),
('samsung', 'S21 Ultra', 'S21 Series', ARRAY['128GB', '256GB', '512GB']),
('samsung', 'S21+', 'S21 Series', ARRAY['128GB', '256GB']),
('samsung', 'S21', 'S21 Series', ARRAY['128GB', '256GB']),
('samsung', 'S21 FE', 'S21 Series', ARRAY['128GB', '256GB']),
('samsung', 'S20 Ultra', 'S20 Series', ARRAY['128GB', '256GB', '512GB']),
('samsung', 'S20+', 'S20 Series', ARRAY['128GB', '512GB']),
('samsung', 'S20', 'S20 Series', ARRAY['128GB', '512GB']),
('samsung', 'S20 FE', 'S20 Series', ARRAY['128GB', '256GB']),
('samsung', 'S10+', 'S10 Series', ARRAY['128GB', '512GB', '1TB']),
('samsung', 'S10', 'S10 Series', ARRAY['128GB', '512GB', '1TB']),
('samsung', 'S10e', 'S10 Series', ARRAY['128GB', '256GB']);

-- Pixel
INSERT INTO products (brand, name, series, capacities) VALUES
('pixel', 'Pixel 9', '9 Series', ARRAY['128GB', '256GB']),
('pixel', 'Pixel 9 Pro', '9 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('pixel', 'Pixel 9 Pro XL', '9 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('pixel', 'Pixel 9 Pro Fold', '9 Series', ARRAY['256GB', '512GB']),
('pixel', 'Pixel 8a', '8 Series', ARRAY['128GB', '256GB']),
('pixel', 'Pixel 8', '8 Series', ARRAY['128GB', '256GB']),
('pixel', 'Pixel 8 Pro', '8 Series', ARRAY['128GB', '256GB', '512GB', '1TB']),
('pixel', 'Pixel 7a', '7 Series', ARRAY['128GB']),
('pixel', 'Pixel 7', '7 Series', ARRAY['128GB', '256GB']),
('pixel', 'Pixel 7 Pro', '7 Series', ARRAY['128GB', '256GB', '512GB']),
('pixel', 'Pixel Fold', 'Fold Series', ARRAY['256GB', '512GB']),
('pixel', 'Pixel 6a', '6 Series', ARRAY['128GB']),
('pixel', 'Pixel 6', '6 Series', ARRAY['128GB', '256GB']),
('pixel', 'Pixel 6 Pro', '6 Series', ARRAY['128GB', '256GB', '512GB']);
