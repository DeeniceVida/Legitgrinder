import { supabase } from '../lib/supabase';
import { PricelistItem, Product, Availability, Client, Consultation, ConsultationStatus } from '../../types';
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
            category: p.category || 'Electronics',
            stockCount: parseInt(p.inventory_quantity || 0)
        }));
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
};

export const fetchClientsData = async (): Promise<Client[]> => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*');

        if (error) throw error;

        return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            location: c.location || '',
            joinedDate: c.joined_date,
            totalSpentKES: parseFloat(c.total_spent_kes || 0),
            orderCount: parseInt(c.order_count || 0),
            lastOrderDate: c.last_order_date || 'Never',
            interests: c.interests || [],
            purchasedItems: c.purchased_items || [],
            purchaseFrequency: c.purchase_frequency as any || 'Low'
        }));
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
};

export const saveClientToSupabase = async (client: Client): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('clients')
            .upsert({
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                location: client.location,
                joined_date: client.joinedDate,
                total_spent_kes: client.totalSpentKES,
                order_count: client.orderCount,
                last_order_date: client.lastOrderDate,
                interests: client.interests,
                purchased_items: client.purchasedItems,
                purchase_frequency: client.purchaseFrequency
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error saving client:', error);
        return { success: false, error };
    }
};

export const fetchConsultations = async (): Promise<Consultation[]> => {
    try {
        const { data, error } = await supabase
            .from('consultations')
            .select('*')
            .order('requested_date', { ascending: false });

        if (error) throw error;

        return data.map((c: any) => ({
            id: c.id.toString(),
            name: c.client_name || 'Unknown',
            email: c.client_email || 'Unknown',
            phone: c.client_phone || '',
            whatsapp: c.client_phone || '', // Using phone as whatsapp for now
            date: c.requested_date ? new Date(c.requested_date).toISOString().split('T')[0] : '',
            time: '00:00', // Time might need a separate column if precise
            topic: c.topic || '',
            status: c.status as ConsultationStatus || ConsultationStatus.PENDING,
            feeUSD: 15
        }));
    } catch (error) {
        console.error('Error fetching consultations:', error);
        return [];
    }
};

export const submitConsultation = async (consultation: Omit<Consultation, 'id' | 'status' | 'feeUSD'>): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('consultations')
            .insert({
                client_name: consultation.name,
                client_email: consultation.email,
                client_phone: consultation.whatsapp,
                topic: consultation.topic,
                status: 'pending'
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error submitting consultation:', error);
        return { success: false, error };
    }
};
