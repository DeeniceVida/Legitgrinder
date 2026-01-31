
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://okfrcfgcnjkindwbquic.supabase.co";
const SUPABASE_KEY = "sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConsultRLS() {
    console.log("🧐 DIAGNOSING CONSULTATION RLS...");

    const { error } = await supabase
        .from('consultations')
        .insert({
            client_name: 'DIAGNOSTIC_BOT',
            client_whatsapp: '0000',
            topic: 'HEALTH_CHECK'
        });

    if (error) {
        console.error("❌ INSERT FAILED:", error.message);
        console.error("Error Code:", error.code);
        console.error("Error Details:", error.details);
    } else {
        console.log("✅ INSERT SUCCEEDED!");
    }
}

checkConsultRLS();
