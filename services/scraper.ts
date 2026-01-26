
import { calculateAutomatedPrice } from '../utils/priceCalculations';
import { PricelistItem, CapacityPrice } from '../types';
import { API_BASE_URL } from '../constants';

/**
 * AUTOMATION FRAMEWORK:
 * 1. Cloudflare Worker fetches this function (or logic within it).
 * 2. It identifies items with `sourceUrl` that ARE NOT in `isManualOverride` status.
 * 3. It updates the prices based on the logic in `calculateAutomatedPrice`.
 */

export async function syncBackMarketPrices(currentData: PricelistItem[]): Promise<PricelistItem[]> {
  console.log("Initiating Global Marketplace Sync...");

  // 1. Try to call the Cloudflare Worker if configured
  const workerUrl = import.meta.env.VITE_WORKER_URL;

  if (workerUrl) {
    try {
      console.log(`Connecting to worker: ${workerUrl}`);
      const response = await fetch(`${workerUrl}/api/sync-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'admin_manual' })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Worker sync successful:", result);
        // In a real app, we would now re-fetch the fresh data from Supabase 
        // because the worker updated the DB in the background.
        // For this demo, we can return the currentData and let the UI refresh mechanism handle it,
        // or simulating the immediate update in the UI state as well.
        return currentData.map(item => ({
          ...item,
          capacities: item.capacities.map(cap => ({
            ...cap,
            lastSynced: 'Synced ' + new Date().toLocaleTimeString() + ' (Cloudflare)'
          }))
        }));
      } else {
        console.warn("Worker sync returned error:", await response.text());
      }
    } catch (err) {
      console.error("Worker connection failed, falling back to local simulation:", err);
    }
  }

  // 2. Fallback: Local Simulation (if no worker or worker fails)
  console.log("Using local simulation logic...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  return currentData.map(item => {
    // Only sync if there is a URL and we aren't overriding it manually
    if (!item.sourceUrl) return item;

    const updatedCapacities = item.capacities.map(cap => {
      // Respect manual overrides set in the Admin Dashboard
      if (cap.isManualOverride) return cap;

      // Simulate a price change found by the scraper
      let baseUSD = cap.sourcePriceUSD || 0;

      // Patch for iPhone 11 to avoid ridiculous prices during simulation
      if (item.modelName === 'iPhone 11' && baseUSD === 0) {
        if (cap.capacity === '64GB') baseUSD = 166;
        else if (cap.capacity === '128GB') baseUSD = 165;
        else if (cap.capacity === '256GB') baseUSD = 217;
      }

      if (baseUSD === 0) baseUSD = 500; // Generic fallback

      const priceDrift = (Math.random() - 0.5) * 10; // Random +/- $5
      const newSourceUSD = Math.max(50, Math.round(baseUSD + priceDrift));
      const newKES = calculateAutomatedPrice(newSourceUSD);

      return {
        ...cap,
        sourcePriceUSD: newSourceUSD,
        currentPriceKES: newKES,
        previousPriceKES: cap.currentPriceKES,
        lastSynced: 'Synced ' + new Date().toLocaleTimeString() + ' (Auto)'
      };
    });

    return {
      ...item,
      capacities: updatedCapacities,
      syncAlert: false
    };
  });
}
