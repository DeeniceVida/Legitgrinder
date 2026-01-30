
import { supabase } from './lib/supabase';

async function checkInventory() {
    const { data: products, error: pError } = await supabase.from('products').select('id, name, brand');
    const { data: variants, error: vError } = await supabase.from('product_variants').select('id, product_id, status');

    console.log(`Summary:`);
    console.log(`Products: ${products?.length || 0}`);
    console.log(`Variants: ${variants?.length || 0}`);

    const productsWithVariants = new Set(variants?.map(v => v.product_id));
    const missingVariants = products?.filter(p => !productsWithVariants.has(p.id));

    if (missingVariants && missingVariants.length > 0) {
        console.log(`Products without variants: ${missingVariants.length}`);
        missingVariants.slice(0, 5).forEach(p => console.log(` - ${p.name} (${p.brand})`));
    } else {
        console.log(`All products have variants.`);
    }

    const activeVariants = variants?.filter(v => v.status === 'active');
    console.log(`Active Variants: ${activeVariants?.length || 0}`);
}

checkInventory();
