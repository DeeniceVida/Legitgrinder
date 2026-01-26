
import { supabase } from '../lib/supabase';
import { PHONE_MODELS_SCHEMA } from '../../constants';
import { calculateAutomatedPrice } from '../../utils/priceCalculations';

// Real baseline USD prices from Back Market (Good condition) for initial seeding
const REAL_BASELINES: Record<string, Record<string, number>> = {
    "iPhone 11": { "64GB": 164, "128GB": 194, "256GB": 256 },
    "iPhone 12": { "64GB": 193, "128GB": 212, "256GB": 230 }
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
                    const baseUSD = REAL_BASELINES[m.name]?.[cap] || 0;
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
