
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://birypkfferkwukogyhnb.supabase.co';
const supabaseAnonKey = 'sb_publishable_hDYAa8ljlY83Xmnf7xlc3Q_mA4cL7A0'; // Using the one from .env.local

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log('--- Supabase Diagnostic ---');

    // 1. Check products count
    const { count: pCount, error: pError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (pError) console.error('Error fetching products count:', pError);
    else console.log('Products count:', pCount);

    // 2. Check product_variants count
    const { count: vCount, error: vError } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true });

    if (vError) console.error('Error fetching variants count:', vError);
    else console.log('Variants count:', vCount);

    // 3. Check active variants
    const { count: aCount, error: aError } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    if (aError) console.error('Error fetching active variants count:', aError);
    else console.log('Active variants count:', aCount);

    // 4. Sample check
    const { data: sample, error: sError } = await supabase
        .from('product_variants')
        .select('id, capacity, status, product_id')
        .limit(1);

    if (sError) console.error('Error fetching sample variant:', sError);
    else console.log('Sample variant:', sample);

    console.log('---------------------------');
}

diagnose();
