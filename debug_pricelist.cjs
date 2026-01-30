
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://okfrcfgcnjkindwbquic.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchPricelist() {
    console.log('Fetching pricelist data...');
    try {
        const { data: variants, error } = await supabase
            .from('product_variants')
            .select(`
                id,
                capacity,
                price_usd,
                price_kes,
                last_updated,
                source_url,
                is_manual_override,
                status,
                products (
                  id,
                  name,
                  brand,
                  series
                )
            `);

        if (error) {
            console.error('Error fetching data:', error);
            return;
        }

        console.log(`Found ${variants ? variants.length : 0} variants.`);

        if (variants && variants.length > 0) {
            console.log('First 3 variants:', JSON.stringify(variants.slice(0, 3), null, 2));

            // replicate the grouping logic to see if it produces results
            const groupedData = {};
            variants.forEach((v) => {
                const product = v.products || v.product;
                if (!product) {
                    console.warn('Variant missing product relation:', v.id);
                    return;
                }

                if (!groupedData[product.id]) {
                    groupedData[product.id] = {
                        id: product.id,
                        modelName: product.name,
                        variations: 0
                    };
                }
                groupedData[product.id].variations++;
            });
            console.log('Grouped Products:', groupedData);
        } else {
            console.log('No variants found in the table. This confirms why the live site might be empty.');
        }


    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

async function checkProducts() {
    console.log('Checking products table...');
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking products:', error);
    } else {
        console.log(`Found ${count} products in the database.`);
    }
}

fetchPricelist().then(checkProducts);
