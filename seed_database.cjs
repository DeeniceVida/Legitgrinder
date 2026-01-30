
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://okfrcfgcnjkindwbquic.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PHONE_MODELS_SCHEMA = {
    iphone: [
        { name: 'iPhone 11', capacities: ['64GB', '128GB', '256GB'], series: '11 Series' },
        { name: 'iPhone 11 Pro', capacities: ['64GB', '256GB', '512GB'], series: '11 Series' },
        { name: 'iPhone 11 Pro Max', capacities: ['64GB', '256GB', '512GB'], series: '11 Series' },
        { name: 'iPhone SE (2nd Gen)', capacities: ['64GB', '128GB', '256GB'], series: 'SE' },
        { name: 'iPhone 12 mini', capacities: ['64GB', '128GB', '256GB'], series: '12 Series' },
        { name: 'iPhone 12', capacities: ['64GB', '128GB', '256GB'], series: '12 Series' },
        { name: 'iPhone 12 Pro', capacities: ['128GB', '256GB', '512GB'], series: '12 Series' },
        { name: 'iPhone 12 Pro Max', capacities: ['128GB', '256GB', '512GB'], series: '12 Series' },
        { name: 'iPhone 13 mini', capacities: ['128GB', '256GB', '512GB'], series: '13 Series' },
        { name: 'iPhone 13', capacities: ['128GB', '256GB', '512GB'], series: '13 Series' },
        { name: 'iPhone 13 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '13 Series' },
        { name: 'iPhone 13 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '13 Series' },
        { name: 'iPhone SE (3rd Gen)', capacities: ['64GB', '128GB', '256GB'], series: 'SE' },
        { name: 'iPhone 14', capacities: ['128GB', '256GB', '512GB'], series: '14 Series' },
        { name: 'iPhone 14 Plus', capacities: ['128GB', '256GB', '512GB'], series: '14 Series' },
        { name: 'iPhone 14 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '14 Series' },
        { name: 'iPhone 14 Pro Max', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '14 Series' },
        { name: 'iPhone 15', capacities: ['128GB', '256GB', '512GB'], series: '15 Series' },
        { name: 'iPhone 15 Plus', capacities: ['128GB', '256GB', '512GB'], series: '15 Series' },
        { name: 'iPhone 15 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '15 Series' },
        { name: 'iPhone 15 Pro Max', capacities: ['256GB', '512GB', '1TB'], series: '15 Series' },
        { name: 'iPhone 16', capacities: ['128GB', '256GB', '512GB'], series: '16 Series' },
        { name: 'iPhone 16 Plus', capacities: ['128GB', '256GB', '512GB'], series: '16 Series' },
        { name: 'iPhone 16 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '16 Series' },
        { name: 'iPhone 16 Pro Max', capacities: ['256GB', '512GB', '1TB'], series: '16 Series' },
        { name: 'iPhone 16e', capacities: ['128GB', '256GB'], series: '16 Series' }
    ],
    samsung: [
        { name: 'S24 Ultra', capacities: ['256GB', '512GB', '1TB'], series: 'S24 Series' },
        { name: 'S24+', capacities: ['256GB', '512GB'], series: 'S24 Series' },
        { name: 'S24', capacities: ['128GB', '256GB', '512GB'], series: 'S24 Series' },
        { name: 'S23 Ultra', capacities: ['256GB', '512GB', '1TB'], series: 'S23 Series' },
        { name: 'S23+', capacities: ['256GB', '512GB'], series: 'S23 Series' },
        { name: 'S23', capacities: ['128GB', '256GB', '512GB'], series: 'S23 Series' },
        { name: 'S22 Ultra', capacities: ['128GB', '256GB', '512GB', '1TB'], series: 'S22 Series' },
        { name: 'S22+', capacities: ['128GB', '256GB'], series: 'S22 Series' },
        { name: 'S22', capacities: ['128GB', '256GB'], series: 'S22 Series' },
        { name: 'S21 Ultra', capacities: ['128GB', '256GB', '512GB'], series: 'S21 Series' },
        { name: 'S21+', capacities: ['128GB', '256GB'], series: 'S21 Series' },
        { name: 'S21', capacities: ['128GB', '256GB'], series: 'S21 Series' },
        { name: 'S21 FE', capacities: ['128GB', '256GB'], series: 'S21 Series' },
        { name: 'S20 Ultra', capacities: ['128GB', '256GB', '512GB'], series: 'S20 Series' },
        { name: 'S20+', capacities: ['128GB', '512GB'], series: 'S20 Series' },
        { name: 'S20', capacities: ['128GB', '512GB'], series: 'S20 Series' },
        { name: 'S20 FE', capacities: ['128GB', '256GB'], series: 'S20 Series' },
        { name: 'S10+', capacities: ['128GB', '512GB', '1TB'], series: 'S10 Series' },
        { name: 'S10', capacities: ['128GB', '512GB', '1TB'], series: 'S10 Series' },
        { name: 'S10e', capacities: ['128GB', '256GB'], series: 'S10 Series' }
    ],
    pixel: [
        { name: 'Pixel 9', capacities: ['128GB', '256GB'], series: '9 Series' },
        { name: 'Pixel 9 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '9 Series' },
        { name: 'Pixel 9 Pro XL', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '9 Series' },
        { name: 'Pixel 9 Pro Fold', capacities: ['256GB', '512GB'], series: '9 Series' },
        { name: 'Pixel 8a', capacities: ['128GB', '256GB'], series: '8 Series' },
        { name: 'Pixel 8', capacities: ['128GB', '256GB'], series: '8 Series' },
        { name: 'Pixel 8 Pro', capacities: ['128GB', '256GB', '512GB', '1TB'], series: '8 Series' },
        { name: 'Pixel 7a', capacities: ['128GB'], series: '7 Series' },
        { name: 'Pixel 7', capacities: ['128GB', '256GB'], series: '7 Series' },
        { name: 'Pixel 7 Pro', capacities: ['128GB', '256GB', '512GB'], series: '7 Series' },
        { name: 'Pixel Fold', capacities: ['256GB', '512GB'], series: 'Fold Series' },
        { name: 'Pixel 6a', capacities: ['128GB'], series: '6 Series' },
        { name: 'Pixel 6', capacities: ['128GB', '256GB'], series: '6 Series' },
        { name: 'Pixel 6 Pro', capacities: ['128GB', '256GB', '512GB'], series: '6 Series' }
    ]
};

async function seedDatabase() {
    console.log('🌱 Starting database seed...');
    let productCount = 0;
    let variantCount = 0;

    for (const [brand, models] of Object.entries(PHONE_MODELS_SCHEMA)) {
        console.log(`Processing brand: ${brand}...`);

        for (const m of models) {
            try {
                // 1. Check if product exists
                const { data: existingProduct, error: fetchError } = await supabase
                    .from('products')
                    .select('id')
                    .eq('name', m.name)
                    .maybeSingle();

                if (fetchError) {
                    console.error(`Error fetching product ${m.name}:`, fetchError.message);
                    continue;
                }

                let productId = existingProduct?.id;

                if (!productId) {
                    // Create new product
                    const { data: newProduct, error: insertError } = await supabase
                        .from('products')
                        .insert({
                            name: m.name,
                            brand: brand.toLowerCase(),
                            series: m.series,
                            category: 'Phones',
                            stock_status: 'On Import',
                            // Default generic image
                            images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800']
                        })
                        .select('id')
                        .single();

                    if (insertError) {
                        console.error(`Error creating product ${m.name}:`, insertError.message);
                        continue;
                    }
                    productId = newProduct.id;
                    productCount++;
                    console.log(`Created product: ${m.name}`);
                } else {
                    // console.log(`Product exists: ${m.name}`);
                }

                // 2. Create Variants
                const variants = m.capacities.map(cap => ({
                    product_id: productId,
                    capacity: cap,
                    price_usd: 0, // Default to 0, needs manual or scraper update
                    price_kes: 0,
                    status: 'active',
                    is_manual_override: false
                }));

                const { error: variantError } = await supabase
                    .from('product_variants')
                    .upsert(variants, { onConflict: 'product_id,capacity' });

                if (variantError) {
                    console.error(`Error creating variants for ${m.name}:`, variantError.message);
                } else {
                    variantCount += variants.length;
                }

            } catch (err) {
                console.error(`Unexpected error processing ${m.name}:`, err);
            }
        }
    }

    console.log('✅ Seed complete!');
    console.log(`New Products: ${productCount}`);
    console.log(`Variants Processed: ${variantCount}`);
}

seedDatabase();
