
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

  // Framework for Cloudflare Worker integration:
  // const response = await fetch(`${API_BASE_URL}/api/sync-prices`, { 
  //   method: 'POST', 
  //   headers: { 'Authorization': 'Bearer YOUR_SECRET' },
  //   body: JSON.stringify(currentData) 
  // });
  // return await response.json();

  // Simulated logic for now:
  await new Promise(resolve => setTimeout(resolve, 2000));

  return currentData.map(item => {
    // Only sync if there is a URL and we aren't overriding it manually
    if (!item.sourceUrl) return item;

    const updatedCapacities = item.capacities.map(cap => {
      // Respect manual overrides set in the Admin Dashboard
      if (cap.isManualOverride) return cap;

      // Simulate a price change found by the scraper
      const priceDrift = (Math.random() - 0.5) * 50; // Random +/- $50
      const newSourceUSD = (cap.sourcePriceUSD || 500) + priceDrift;
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
