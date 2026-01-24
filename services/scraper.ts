
import { calculateAutomatedPrice } from '../utils/priceCalculations';
import { PricelistItem, CapacityPrice } from '../types';

/**
 * UPDATED SCRAPER LOGIC:
 * Now targets specifically items that have a 'sourceUrl'.
 * If a URL is provided, it simulates a deep scrape of that page.
 * If no URL is provided, the item remains in standby.
 */

export async function syncBackMarketPrices(currentData: PricelistItem[]): Promise<PricelistItem[]> {
  console.log("Initiating Targeted Scraper Sync...");
  
  // Simulate network delay for scraping the provided links
  await new Promise(resolve => setTimeout(resolve, 2000));

  return currentData.map(item => {
    // Only scrape if a URL is provided
    if (!item.sourceUrl) return item;

    console.log(`Scraping target: ${item.sourceUrl}`);
    
    let hasSyncAlert = false;
    const updatedCapacities = item.capacities.map(cap => {
      // SCRAPING LOGIC SIMULATION:
      // For a specific URL, "Good" condition has a 10% chance of being OOS per capacity
      const isGoodInStock = Math.random() > 0.1;
      
      let sourcePriceUSD: number | null = null;
      let finalKES = cap.currentPriceKES;

      if (isGoodInStock) {
        // Realistic price range for US Tech imports
        const base = 400 + (Math.random() * 600);
        sourcePriceUSD = base;
        finalKES = calculateAutomatedPrice(sourcePriceUSD);
      } else {
        hasSyncAlert = true; 
        sourcePriceUSD = null; // Mark as OOS
      }

      return {
        ...cap,
        sourcePriceUSD,
        currentPriceKES: finalKES,
        previousPriceKES: cap.currentPriceKES,
        lastSynced: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        isManualOverride: false
      };
    });

    return {
      ...item,
      capacities: updatedCapacities,
      syncAlert: hasSyncAlert
    };
  });
}
