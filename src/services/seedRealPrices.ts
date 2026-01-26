
import { supabase } from '../lib/supabase';
import { calculateAutomatedPrice } from '../../utils/priceCalculations';

export const updateIPhone11Baseline = async () => {
    try {
        // 1. Get the iPhone 11 product ID
        const { data: products, error: pError } = await supabase
            .from('products')
            .select('id')
            .eq('name', 'iPhone 11')
            .single();

        if (pError || !products) {
            console.error('Could not find iPhone 11 in products table.', pError);
            return;
        }

        const productId = products.id;

        // 2. Define real USD baseline from Back Market (Good condition)
        const baselines = [
            { capacity: '64GB', usd: 166, url: 'https://www.backmarket.com/en-us/p/iphone-11-64-gb-black-unlocked-gsm/49fbcceb-6d56-42e4-8ccc-b7bb1dfa8ae4' },
            { capacity: '128GB', usd: 165, url: 'https://www.backmarket.com/en-us/p/iphone-11-128-gb-black-unlocked/547a9196-b6e5-4f02-9019-e80c43115a62' },
            { capacity: '256GB', usd: 217, url: 'https://www.backmarket.com/en-us/p/iphone-11-256-gb-black-unlocked/93fa5c8f-c66f-42e8-83af-700b2a9cd108' }
        ];

        // 3. Update each variant
        for (const b of baselines) {
            const finalKES = calculateAutomatedPrice(b.usd);

            const { error: vError } = await supabase
                .from('product_variants')
                .update({
                    price_usd: b.usd,
                    price_kes: finalKES,
                    source_url: b.url,
                    last_updated: new Date().toISOString(),
                    status: 'active'
                })
                .match({ product_id: productId, capacity: b.capacity });

            if (vError) {
                console.error(`Error updating variant ${b.capacity}:`, vError);
            } else {
                console.log(`Successfully updated iPhone 11 ${b.capacity} to KES ${finalKES.toLocaleString()}`);
            }
        }
    } catch (err) {
        console.error('Unexpected error during price update:', err);
    }
};
