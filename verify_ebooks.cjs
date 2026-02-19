const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://okfrcfgcnjkindwbquic.supabase.co";
const SUPABASE_KEY = "sb_publishable_g_SRjmEZGw7RHs4Kz24eZQ_qXebmnZ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyEbooksTable() {
    console.log("🧐 VERIFYING EBOOKS TABLE...");

    const { data, error } = await supabase
        .from('ebooks')
        .select('*')
        .limit(1);

    if (error) {
        if (error.code === 'PGRST204' || error.message.includes('Could not find')) {
            console.error("❌ EBOOKS TABLE STILL MISSING!");
            console.error("Error Message:", error.message);
        } else {
            console.error("❌ SELECT FAILED (but table might exist):", error.message);
            console.error("Error Code:", error.code);
        }
    } else {
        console.log("✅ EBOOKS TABLE DETECTED!");
    }
}

verifyEbooksTable();
