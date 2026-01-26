
// Cloudflare Worker: legit-sync-master
// Trigger: Scheduled (CRON) or HTTP Request (from Admin Dashboard)

import { createClient } from '@supabase/supabase-js';

export interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
    // 1. Handle HTTP requests (Force Sync button)
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/api/sync-prices') {
            await this.syncPrices(env);
            return new Response(JSON.stringify({ success: true, message: 'Sync triggered manually' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response('LegitGrinder Sync Bot Active', { status: 200 });
    },

    // 2. Handle Scheduled Cron Jobs (Every 21 days or custom interval)
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('Cron trigger fired');
        await this.syncPrices(env);
    },

    // Core Logic
    async syncPrices(env: Env) {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // A. Fetch Products needing update (oldest first)
        // In a real scenario, we limit this to avoid timeouts (e.g., 10 at a time)
        const { data: variants, error } = await supabase
            .from('product_variants')
            .select('*, products(name, brand)')
            .eq('is_manual_override', false) // Don't touch manual prices
            .order('last_updated', { ascending: true }) // Oldest first
            .limit(10);

        if (error || !variants) {
            console.error('Database fetch error', error);
            return;
        }

        console.log(`Processing ${variants.length} items...`);

        // B. Iterate and Scrape
        for (const variant of variants) {
            // Construct Back Market Search URL (Dynamic based on product name + capacity)
            // Note: In a production app, you would store the specific 'source_url' column.
            // For this demo, we construct a search query structure common to Back Market.
            // Example: https://www.backmarket.com/en-us/search?q=iPhone%2013%20128GB

            // MOCKING THE SCRAPE FOR DEMONSTRATION STABILITY
            // Why? Cloudflare Workers cannot run full Puppeteer/Chrome headless easily without specific paid addons (Browser Rendering API).
            // We will simulate the *result* of a successful scrape here to prove the data flow.

            const currentPrice = variant.price_usd;
            const drift = (Math.random() - 0.5) * 10; // Slight fluctuation +/- $5
            const newPrice = Math.max(50, Math.round(currentPrice + drift)); // Ensure price doesn't drop below reasonable floor

            // C. Update Database
            await supabase
                .from('product_variants')
                .update({
                    price_usd: newPrice,
                    // Recalculate KES: (USD + Shipping + Service) * 135
                    price_kes: Math.ceil((newPrice + 20 + 30) * 135),
                    last_updated: new Date().toISOString()
                })
                .eq('id', variant.id);

            console.log(`Updated ${variant.products?.name} ${variant.capacity}: $${currentPrice} -> $${newPrice}`);
        }
    }
};
