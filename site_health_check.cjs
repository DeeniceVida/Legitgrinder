
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://okfrcfgcnjkindwbquic.supabase.co";
const SUPABASE_KEY = "sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function siteHealthAudit() {
    console.log("🏥 LEGITGRINDER SITE HEALTH AUDIT (" + new Date().toISOString() + ")");
    console.log("--------------------------------------------------");

    try {
        // 1. Check Connectivity & Pipe A
        const { count: models, error: mErr } = await supabase.from('pricelist_models').select('*', { count: 'exact', head: true });
        const { count: variants, error: vErr } = await supabase.from('pricelist_variants').select('*', { count: 'exact', head: true });

        console.log("📂 PIPE A (Phone Registry):");
        if (mErr || vErr) {
            console.log("  ❌ Error: " + (mErr?.message || vErr?.message));
        } else {
            console.log(`  ✅ Models: ${models}`);
            console.log(`  ✅ Prices: ${variants}`);
        }

        // 2. Check Pipe B
        const { count: products, error: pErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
        console.log("\n🛍️ PIPE B (Shop Inventory):");
        if (pErr) {
            console.log("  ❌ Error: " + pErr.message);
        } else {
            console.log(`  ✅ Active Products: ${products}`);
            if (products > 10) console.log("  ⚠️ Tip: Use the 'Purge' button if these contain legacy phone stock.");
        }

        // 3. User Feature Integrity (RLS)
        console.log("\n🔒 FEATURE INTEGRITY (Security):");

        // Test Sourcing Insert (Silent)
        const { error: sErr } = await supabase.from('sourcing_requests').insert({ product_name: 'HEALTH_CHECK', client_name: 'SYSTEM', client_whatsapp: '000' });
        console.log(sErr ? "  ❌ Sourcing Quest: Locked" : "  ✅ Sourcing Quest: Open (Optimized)");

        // Test Consultation Insert (Silent)
        const { error: cErr } = await supabase.from('consultations').insert({
            client_name: 'SYSTEM',
            client_email: 'audit@legitgrinder.com',
            client_whatsapp: '000',
            requested_date: new Date().toISOString()
        });
        console.log(cErr ? "  ❌ Consultations: Locked" : "  ✅ Consultations: Open");

        console.log("\n--------------------------------------------------");
        console.log("OVERALL HEALTH: " + ((mErr || vErr || sErr || cErr) ? "⚠️ ATTENTION REQUIRED" : "🟢 OPTIMAL"));

    } catch (e) {
        console.error("Audit aborted: ", e);
    }
}

siteHealthAudit();
