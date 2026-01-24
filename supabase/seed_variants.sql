-- Explode the capacities array from 'products' into individual rows in 'product_variants'
INSERT INTO product_variants (product_id, capacity)
SELECT id, unnest(capacities)
FROM products
ON CONFLICT (product_id, capacity) DO NOTHING;
