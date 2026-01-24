import { createClient } from '@supabase/supabase-js';

interface Env {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
}

// Configuration
const CONFIG = {
    MAX_DAILY_SCRAPES: 15,
    UPDATE_CYCLE_DAYS: 21,
    START_HOUR: 9,
    END_HOUR: 18,
    SKIP_WEEKENDS: true,
};

// Fees (Matches existing formula)
const FEES = {
    FIXED_USD: 8,
    SHIPPING_FLAT: 20,
    SHIPPING_PERCENT: 0.035,
    SERVICE_FEE_FLAT: 30,
    SERVICE_FEE_PERCENT: 0.045,
    THRESHOLD_USD: 750,
    KES_PER_USD: 135,
};

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

        // 1. Time Check
        const now = new Date();
        const currentHour = now.getUTCHours() + 3; // EAT is UTC+3
        const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

        if (CONFIG.SKIP_WEEKENDS && (dayOfWeek === 0 || dayOfWeek === 6)) {
            console.log("Skipping: Weekend");
            return;
        }

        if (currentHour < CONFIG.START_HOUR || currentHour >= CONFIG.END_HOUR) {
            console.log(`Skipping: Outside operating hours (${currentHour}:00 EAT)`);
            return;
        }

        // 2. Daily Limit Check
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const { count, error: countError } = await supabase
            .from('scraper_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay.toISOString());

        if (countError || (count !== null && count >= CONFIG.MAX_DAILY_SCRAPES)) {
            console.log("Skipping: Daily limit reached");
            return;
        }

        // 3. Select Target (Oldest updated, or never updated)
        // We need to find a variant with a source_url that needs updating
        // Note: This query assumes we have populated product_variants
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CONFIG.UPDATE_CYCLE_DAYS);

        const { data: variants, error: fetchError } = await supabase
            .from('product_variants')
            .select('id, source_url')
            .not('source_url', 'is', null)
            .or(`last_updated.is.null,last_updated.lt.${cutoffDate.toISOString()}`)
            .limit(1);

        if (fetchError || !variants || variants.length === 0) {
            console.log("No variants need updating");
            return;
        }

        const target = variants[0];

        // 4. Scrape Logic
        try {
            console.log(`Scraping: ${target.source_url}`);

            // Stealth: Random User Agent
            const USER_AGENTS = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
            ];
            const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

            const response = await fetch(target.source_url!, {
                headers: {
                    "User-Agent": randomAgent,
                    "Accept-Language": "en-US,en;q=0.9",
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();

            // Basic regex parsing for price (This is fragile and depends on Back Market HTML structure)
            // Looking for currency symbol and digits, typically in a specific data attribute or bold tag
            // For stealth/robustness, a parser like Cheerio would be better but adds size.
            // Trying to find text like "$450.00" or similar structure near "Good condition"

            // MOCK LOGIC FOR DEMONSTRATION (Since we can't reliably regex arbitrary HTML blindly)
            // In a real scenario, we would refine this selector based on inspecting Back Market's DOM
            // For now, let's simulate extracting a price if the fetch succeeded
            let extractedPriceUSD = 0;

            // Placeholder for real parsing logic:
            // const priceMatch = text.match(/some-regex/);
            // if (priceMatch) extractedPriceUSD = parseFloat(priceMatch[1]);

            // Fallback/Simulated for the purpose of this setup:
            // If the page contains "Out of Stock", mark as such.
            if (text.includes("Out of stock") || text.includes("out of stock")) {
                await supabase.from('product_variants').update({
                    status: 'out_of_stock',
                    last_updated: new Date().toISOString()
                }).eq('id', target.id);

                await logResult(supabase, target.id, 'success', 'Marked out of stock');
                return;
            }

            // 5. Calculate Price Formula
            // Replicating: Base + 8 + (20 + 0.035*Base) + (30 or 0.045*Base) * 135
            // Assume we extracted $500 for demo if regex fails so we can test the formula code
            if (extractedPriceUSD === 0) {
                // We throw here in real prod, but for this scaffolding we'll log a warning
                throw new Error("Could not parse price from HTML");
            }

            const base = extractedPriceUSD;
            const fixed = base + FEES.FIXED_USD;
            const shipping = FEES.SHIPPING_FLAT + (base * FEES.SHIPPING_PERCENT);
            let service = 0;

            if (base <= FEES.THRESHOLD_USD) {
                service = FEES.SERVICE_FEE_FLAT;
            } else {
                service = base * FEES.SERVICE_FEE_PERCENT;
            }

            const totalUSD = fixed + shipping + service;
            const totalKES = Math.ceil(totalUSD * FEES.KES_PER_USD);

            // 6. Update DB
            await supabase.from('product_variants').update({
                price_usd: base,
                price_kes: totalKES,
                status: 'active',
                last_updated: new Date().toISOString()
            }).eq('id', target.id);

            await logResult(supabase, target.id, 'success', `Updated: $${base} -> KES ${totalKES}`);

        } catch (err: any) {
            console.error(err);
            await logResult(supabase, target.id, 'fail', err.message);
        }
    }
};

async function logResult(supabase: any, variantId: number, status: string, message: string) {
    await supabase.from('scraper_logs').insert({
        variant_id: variantId,
        status,
        message
    });
}
