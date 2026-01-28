
import { supabase } from '../lib/supabase';
import { PHONE_MODELS_SCHEMA } from '../constants';

const PRODUCT_LINKS: Record<string, string> = {
    "iPhone 15 Pro Max": "https://www.backmarket.com/en-us/p/iphone-15-pro-max",
    "iPhone 15 Pro": "https://www.backmarket.com/en-us/p/iphone-15-pro",
    "iPhone 15 Plus": "https://www.backmarket.com/en-us/p/iphone-15-plus",
    "iPhone 15": "https://www.backmarket.com/en-us/p/iphone-15",
    "iPhone 14 Pro Max": "https://www.backmarket.com/en-us/p/iphone-14-pro-max",
    "iPhone 14 Pro": "https://www.backmarket.com/en-us/p/iphone-14-pro",
    "iPhone 14 Plus": "https://www.backmarket.com/en-us/p/iphone-14-plus",
    "iPhone 14": "https://www.backmarket.com/en-us/p/iphone-14",
    "iPhone 13 Pro Max": "https://www.backmarket.com/en-us/p/iphone-13-pro-max",
    "iPhone 13 Pro": "https://www.backmarket.com/en-us/p/iphone-13-pro",
    "iPhone 13 mini": "https://www.backmarket.com/en-us/p/iphone-13-mini",
    "iPhone 13": "https://www.backmarket.com/en-us/p/iphone-13",
    "iPhone 12 Pro Max": "https://www.backmarket.com/en-us/p/iphone-12-pro-max",
    "iPhone 12 Pro": "https://www.backmarket.com/en-us/p/iphone-12-pro",
    "iPhone 12": "https://www.backmarket.com/en-us/p/iphone-12",
    "iPhone 11 Pro Max": "https://www.backmarket.com/en-us/p/iphone-11-pro-max",
    "iPhone 11 Pro": "https://www.backmarket.com/en-us/p/iphone-11-pro",
    "iPhone 11": "https://www.backmarket.com/en-us/p/iphone-11",
    "S24 Ultra": "https://www.backmarket.com/en-us/p/galaxy-s24-ultra",
    "S23 Ultra": "https://www.backmarket.com/en-us/p/galaxy-s23-ultra",
    "S22 Ultra": "https://www.backmarket.com/en-us/p/galaxy-s22-ultra",
    "Pixel 8 Pro": "https://www.backmarket.com/en-us/p/google-pixel-8-pro",
    "Pixel 7 Pro": "https://www.backmarket.com/en-us/p/google-pixel-7-pro"
};

export const syncAllMasterLinks = async () => {
    console.log("💎 Initiating Master Link Sync...");
    let count = 0;

    for (const [name, url] of Object.entries(PRODUCT_LINKS)) {
        try {
            // Find products matching the name
            const { data: products, error: pError } = await supabase
                .from('products')
                .select('id')
                .ilike('name', `%${name}%`);

            if (pError || !products) continue;

            for (const p of products) {
                const { error: vError } = await supabase
                    .from('product_variants')
                    .update({ source_url: url })
                    .eq('product_id', p.id);

                if (!vError) count++;
            }
        } catch (e) {
            console.error(e);
        }
    }
    return count;
};

export const seedFullInventory = async () => {
    console.log("🌱 Seeding Global Inventory from Schema...");
    let productCount = 0;
    let variantCount = 0;

    for (const [brand, models] of Object.entries(PHONE_MODELS_SCHEMA)) {
        for (const m of models) {
            try {
                // 1. Create Product
                const { data: product, error: pError } = await supabase
                    .from('products')
                    .insert({
                        name: m.name,
                        brand: brand,
                        series: m.series,
                        category: 'Phones',
                        stock_status: 'On Import'
                    })
                    .select('id')
                    .single();

                if (pError) {
                    console.error(`Error creating product ${m.name}:`, pError);
                    continue;
                }
                productCount++;

                // 2. Create Variants
                const variants = m.capacities.map(cap => ({
                    product_id: product.id,
                    capacity: cap,
                    price_usd: 500, // Starting baseline
                    price_kes: Math.ceil((500 + 20 + 30) * 135), // Correct calculation
                    status: 'active'
                }));

                const { error: vError } = await supabase
                    .from('product_variants')
                    .insert(variants);

                if (vError) console.error(`Error variants for ${m.name}:`, vError);
                else variantCount += variants.length;

            } catch (e) {
                console.error(e);
            }
        }
    }
    return { productCount, variantCount };
};
