
import { supabase } from '../lib/supabase';
import { PricelistItem } from '../../types';
import { calculateAutomatedPrice } from '../../utils/priceCalculations';

export const fetchPricelistData = async (): Promise<PricelistItem[]> => {
    try {
        const { data: variants, error } = await supabase
            .from('product_variants')
            .select(`
        id,
        capacity,
        price_usd,
        price_kes,
        last_updated,
        source_url,
        products (
          id,
          name,
          brand,
          series
        )
      `)
            .eq('status', 'active');

        if (error) throw error;

        // Group variants by product
        const groupedData: Record<string, PricelistItem> = {};

        variants?.forEach((v: any) => {
            const product = v.products;
            if (!product) return;

            if (!groupedData[product.id]) {
                groupedData[product.id] = {
                    id: product.id,
                    modelName: product.name,
                    brand: product.brand as 'iphone' | 'samsung' | 'pixel',
                    series: product.series,
                    capacities: [],
                    syncAlert: false,
                    sourceUrl: v.source_url
                };
            }

            groupedData[product.id].capacities.push({
                capacity: v.capacity,
                currentPriceKES: v.price_kes || 0,
                previousPriceKES: 0, // Could be handled by adding previous_price_kes to query
                lastSynced: v.last_updated ? new Date(v.last_updated).toLocaleString() : 'Never',
                sourcePriceUSD: v.price_usd || 0,
                isManualOverride: false // This flag should ideally come from the DB as well
            });
        });

        return Object.values(groupedData);
    } catch (error) {
        console.error('Error fetching pricelist:', error);
        return [];
    }
};
