
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
      let baseUSD = cap.sourcePriceUSD || 0;

      // Patch for iPhone 11 to avoid ridiculous prices during simulation
      if (item.modelName === 'iPhone 11' && baseUSD === 0) {
        if (cap.capacity === '64GB') baseUSD = 166;
        else if (cap.capacity === '128GB') baseUSD = 165;
        else if (cap.capacity === '256GB') baseUSD = 217;
      }

      if (baseUSD === 0) baseUSD = 500; // Generic fallback

      const priceDrift = (Math.random() - 0.5) * 20; // Reduce drift to +/- $20
      const newSourceUSD = baseUSD + priceDrift;
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
