
import { supabase } from '../lib/supabase';
import { PHONE_MODELS_SCHEMA } from '../../constants';
import { calculateAutomatedPrice } from '../../utils/priceCalculations';

// Real baseline USD prices from Back Market (Good condition) for initial seeding
const REAL_BASELINES: Record<string, Record<string, number>> = {
    "iPhone 11": { "64GB": 166, "128GB": 165, "256GB": 217 }
};

export const seedDatabaseProducts = async () => {
    console.log("Starting master product seed with realistic baselines...");

    for (const [brand, models] of Object.entries(PHONE_MODELS_SCHEMA)) {
        const typedModels = models as any[];

        for (const m of typedModels) {
            try {
                // 1. Insert or get Product
                const { data: product, error: pError } = await supabase
                    .from('products')
                    .upsert({
                        name: m.name,
                        brand: brand,
                        series: m.series,
                        capacities: m.capacities,
                        category: 'Electronics'
                    }, { onConflict: 'name' })
                    .select()
                    .single();

                if (pError) {
                    console.error(`Error seeding product ${m.name}:`, pError);
                    continue;
                }

                // 2. Insert variants (capacities) with real baseline logic
                const variantRows = m.capacities.map((cap: string) => {
                    const baseUSD = REAL_BASELINES[m.name]?.[cap] || 0;
                    return {
                        product_id: product.id,
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
                } else {
                    console.log(`Successfully seeded ${m.name} with ${m.capacities.length} variants.`);
                }
            } catch (err) {
                console.error(`Unexpected error for ${m.name}:`, err);
            }
        }
    }

    console.log("Product seeding complete!");
};
