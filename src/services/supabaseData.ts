
import { supabase } from '../lib/supabase';
import { PricelistItem, Product, Availability } from '../../types';
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

export const fetchInventoryProducts = async (): Promise<Product[]> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            // Filter to only get shop products, not pricelist source products
            // Based on migration_products_v4.sql, we can use category or just check for shop-specific fields
            .not('price_kes', 'is', null);

        if (error) throw error;

        return data.map((p: any) => ({
            id: p.id.toString(),
            name: p.name,
            priceKES: parseFloat(p.price_kes),
            discountPriceKES: p.discount_price ? parseFloat(p.discount_price) : undefined,
            imageUrls: p.images && p.images.length > 0 ? p.images : [p.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800'],
            variations: p.shop_variants || [],
            availability: p.stock_status as Availability,
            shippingDuration: p.shipping_duration || '2-3 Business Days',
            description: p.description || '',
            category: p.category || 'Electronics'
        }));
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
};
