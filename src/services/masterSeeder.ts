
import { supabase } from '../lib/supabase';
import { PHONE_MODELS_SCHEMA } from '../../constants';
import { calculateAutomatedPrice } from '../../utils/priceCalculations';

// Real baseline USD prices from Back Market (Good condition) for initial seeding
const REAL_BASELINES: Record<string, Record<string, number>> = {
    "iPhone 7": { "default": 75 },
    "iPhone 8": { "default": 101 },
    "iPhone 8 Plus": { "default": 120 },
    "iPhone XR": { "default": 117 },
    "iPhone SE (2nd Gen)": { "default": 110 },
    "iPhone SE (3rd Gen)": { "default": 137 },
    "iPhone 11": { "64GB": 164, "128GB": 194, "256GB": 256 },
    "iPhone 11 Pro": { "64GB": 203, "256GB": 235, "512GB": 265 },
    "iPhone 11 Pro Max": { "default": 233 },
    "iPhone 12 mini": { "default": 155 },
    "iPhone 12": { "64GB": 184, "128GB": 212, "256GB": 230 },
    "iPhone 12 Pro": { "128GB": 286, "256GB": 307, "512GB": 322 },
    "iPhone 12 Pro Max": { "128GB": 308, "256GB": 321, "512GB": 343 },
    "iPhone 13 mini": { "128GB": 231, "256GB": 260, "512GB": 280 },
    "iPhone 13": { "128GB": 245, "256GB": 275, "512GB": 289 },
    "iPhone 13 Pro": { "128GB": 315, "256GB": 335, "512GB": 355, "1TB": 375 },
    "iPhone 13 Pro Max": { "128GB": 398, "256GB": 418, "512GB": 448, "1TB": 468 },
    "iPhone 14": { "128GB": 277, "256GB": 300, "512GB": 362 },
    "iPhone 14 Plus": { "128GB": 303, "256GB": 323, "512GB": 353 },
    "iPhone 14 Pro": { "128GB": 394, "256GB": 414, "512GB": 444, "1TB": 474 },
    "iPhone 14 Pro Max": { "128GB": 414, "256GB": 434, "512GB": 464, "1TB": 494 },
    "iPhone 15": { "128GB": 407, "256GB": 400, "512GB": 407 },
    "iPhone 15 Plus": { "128GB": 410, "256GB": 430, "512GB": 450 },
    "iPhone 15 Pro": { "128GB": 446, "256GB": 476, "512GB": 506, "1TB": 536 },
    "iPhone 15 Pro Max": { "256GB": 561, "512GB": 591, "1TB": 621 },
    "iPhone 16e": { "128GB": 410, "256GB": 505 },
    "iPhone 16": { "128GB": 511, "256GB": 609, "512GB": 835 },
    "iPhone 16 Plus": { "128GB": 600, "256GB": 630, "512GB": 660 },
    "iPhone 16 Pro": { "128GB": 618, "256GB": 698, "512GB": 720, "1TB": 750 },
    "iPhone 16 Pro Max": { "256GB": 770, "512GB": 898, "1TB": 928 },
    "iPhone 17 Pro Max": { "default": 1440 }
};

export const seedDatabaseProducts = async () => {
    console.log("Starting master product seed with realistic baselines...");
    let successCount = 0;
    let errorCount = 0;

    for (const [brand, models] of Object.entries(PHONE_MODELS_SCHEMA)) {
        const typedModels = models as any[];

        for (const m of typedModels) {
            try {
                // 1. Check if product exists
                let productId: number;
                const { data: existingProduct } = await supabase
                    .from('products')
                    .select('id')
                    .eq('name', m.name)
                    .maybeSingle();

                if (existingProduct) {
                    productId = existingProduct.id;
                    // Update existing product to ensure series/capacities are synced
                    await supabase
                        .from('products')
                        .update({
                            brand: brand,
                            series: m.series,
                            capacities: m.capacities
                        })
                        .eq('id', productId);
                } else {
                    // Create new product
                    const { data: newProduct, error: pError } = await supabase
                        .from('products')
                        .insert({
                            name: m.name,
                            brand: brand,
                            series: m.series,
                            capacities: m.capacities
                        })
                        .select()
                        .single();

                    if (pError) {
                        console.error(`Error creating product ${m.name}:`, pError);
                        errorCount++;
                        continue;
                    }
                    productId = newProduct.id;
                }

                // 2. Insert variants (capacities) with real baseline logic
                const variantRows = m.capacities.map((cap: string) => {
                    const baseUSD = REAL_BASELINES[m.name]?.[cap] || REAL_BASELINES[m.name]?.['default'] || 0;
                    return {
                        product_id: productId,
                        capacity: cap,
                        price_usd: baseUSD,
                        price_kes: baseUSD > 0 ? calculateAutomatedPrice(baseUSD) : 0,
                        status: 'active',
                        last_updated: baseUSD > 0 ? new Date().toISOString() : null
                    };
                });

                const { error: vError } = await supabase
                    .from('product_variants')
                    .upsert(variantRows, { onConflict: 'product_id, capacity' });

                if (vError) {
                    console.error(`Error seeding variants for ${m.name}:`, vError);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.error(`Unexpected error for ${m.name}:`, err);
                errorCount++;
            }
        }
    }

    console.log(`Product seeding complete! Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
};
