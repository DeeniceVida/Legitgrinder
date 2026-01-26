
import { supabase } from '../lib/supabase';
import { PHONE_MODELS_SCHEMA } from '../../constants';

export const seedDatabaseProducts = async () => {
    console.log("Starting master product seed...");

    for (const [brand, models] of Object.entries(PHONE_MODELS_SCHEMA)) {
        const typedModels = models as any[];
        console.log(`Processing brand: ${brand}`);

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

                // 2. Insert variants (capacities)
                const variantRows = m.capacities.map(cap => ({
                    product_id: product.id,
                    capacity: cap,
                    status: 'active'
                }));

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
