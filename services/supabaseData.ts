
import { supabase } from '../lib/supabase';
import { PricelistItem, Product, Availability, Client, Consultation, ConsultationStatus, BlogPost, FAQItem, Invoice, OrderStatus, SourcingRequest } from '../types';

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
                is_manual_override,
                status,
                products (
                  id,
                  name,
                  brand,
                  series
                )
            `);
        // Removed .eq('status', 'active') temporarily to see if it makes a difference

        if (error) throw error;

        console.log(`🔍 DEBUG: Found ${variants?.length || 0} variants in DB.`);

        // Group variants by product
        const groupedData: Record<string, PricelistItem> = {};

        variants?.forEach((v: any) => {
            // Support both singular and plural join keys
            const product = v.products || v.product;
            if (!product) return;

            if (!groupedData[product.id]) {
                groupedData[product.id] = {
                    id: product.id,
                    modelName: product.name,
                    brand: (product.brand?.toLowerCase() || 'iphone') as 'iphone' | 'samsung' | 'pixel',
                    series: product.series,
                    capacities: [],
                    syncAlert: false,
                    sourceUrl: v.source_url
                };
            }

            groupedData[product.id].capacities.push({
                id: v.id,
                capacity: v.capacity,
                currentPriceKES: v.price_kes || 0,
                previousPriceKES: 0,
                lastSynced: v.last_updated ? new Date(v.last_updated).toLocaleString() : 'Never',
                sourcePriceUSD: v.price_usd || 0,
                isManualOverride: v.is_manual_override || false
            });
        });


        const result = Object.values(groupedData);
        console.log(`🔍 DEBUG: Grouped into ${result.length} unique products.`);

        // --- FALLBACK MECHANISM ---
        // If database is empty (wiped or connection issue), generate from static schema
        // to prevent "No models found" error.
        if (result.length === 0) {
            console.warn('⚠️ WARNING: Database returned 0 items. Activating Failover Protocol.');
            const { PHONE_MODELS_SCHEMA, KES_PER_USD } = await import('../constants'); // Dynamic import to avoid cycles if any

            const fallbackList: PricelistItem[] = [];

            Object.entries(PHONE_MODELS_SCHEMA).forEach(([brand, models]) => {
                models.forEach((m: any) => {
                    fallbackList.push({
                        id: `fallback-${m.name}`,
                        modelName: m.name,
                        brand: brand as any,
                        series: m.series,
                        syncAlert: true, // Mark as requiring sync
                        capacities: m.capacities.map((cap: string, idx: number) => ({
                            id: `fallback-${m.name}-${cap}`,
                            capacity: cap,
                            currentPriceKES: 0, // Indicate "On Request" or 0
                            previousPriceKES: 0,
                            lastSynced: 'System Fallback',
                            sourcePriceUSD: 0,
                            isManualOverride: false
                        }))
                    });
                });
            });
            console.log(`🛡️ FAILOVER: Generated ${fallbackList.length} static fallback items.`);
            return fallbackList;
        }
        // --------------------------

        return result;
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
            .not('price_kes', 'is', null);

        if (error) throw error;

        return data.map((p: any) => ({
            id: p.id.toString(),
            name: p.name,
            priceKES: parseFloat(p.price_kes),
            discountPriceKES: p.discount_price ? parseFloat(p.discount_price) : undefined,
            imageUrls: p.images && p.images.length > 0 ? p.images : [p.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800'],
            variations: Array.isArray(p.shop_variants) ? p.shop_variants : [],
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

        return (data || []).map((c: any) => {
            // Parse requested_date (ISO string) into date and time
            const dateObj = new Date(c.requested_date);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g. 29 Jan 2026
            const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }); // e.g. 04:30 PM

            // Normalize status: Map database string to enum string if necessary
            let status = c.status;
            if (status === 'pending_approval') status = ConsultationStatus.PENDING;
            if (status === 'doable') status = ConsultationStatus.DOABLE;
            if (status === 'paid') status = ConsultationStatus.PAID;
            if (status === 'cancelled') status = ConsultationStatus.CANCELLED;

            return {
                id: c.id.toString(),
                name: c.client_name || 'Individual Client',
                email: c.client_email || 'N/A',
                phone: c.client_phone || 'N/A',
                whatsapp: c.client_whatsapp || '',
                date: dateStr,
                time: timeStr,
                topic: c.topic || 'General Sourcing Discussion',
                status: status as ConsultationStatus,
                feeUSD: parseFloat(c.fee_usd || 15)
            };
        });
    } catch (error) {
        console.error('Error fetching consultations:', error);
        return [];
    }
};

export const fetchBlogsData = async (): Promise<BlogPost[]> => {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map((b: any) => ({
            id: b.id.toString(),
            title: b.title,
            excerpt: b.excerpt,
            content: b.content,
            imageUrl: b.image_url,
            category: b.category,
            date: b.date,
            author: b.author
        }));
    } catch (error) {
        console.error('Error fetching blogs:', error);
        return [];
    }
};

// ========================================
// PHASE 3: ADMIN HUB ENHANCEMENTS

// Invoice Management
export const fetchInvoicesData = async (): Promise<Invoice[]> => {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            clientName: inv.client_name,
            productName: inv.product_name,
            quantity: inv.quantity || 1,
            status: inv.status as OrderStatus,
            progress: inv.progress || 0,
            lastUpdate: inv.last_update ? new Date(inv.last_update).toLocaleString() : 'Never',
            isPaid: inv.is_paid,
            totalKES: parseFloat(inv.total_kes || 0),
            paystackReference: inv.paystack_reference,
            date: inv.created_at,
            createdAt: inv.created_at
        }));
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return [];
    }
};

export const getUserInvoices = async (userId: string): Promise<Invoice[]> => {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            clientName: inv.client_name,
            productName: inv.product_name,
            quantity: inv.quantity || 1,
            status: inv.status as OrderStatus,
            progress: inv.progress || 0,
            lastUpdate: inv.last_update ? new Date(inv.last_update).toLocaleString() : 'Never',
            isPaid: inv.is_paid,
            totalKES: parseFloat(inv.total_kes || 0),
            paystackReference: inv.paystack_reference,
            date: inv.created_at,
            createdAt: inv.created_at
        }));
    } catch (error) {
        console.error('Error fetching user invoices:', error);
        return [];
    }
};

export const updateInvoiceStatus = async (id: string, status: OrderStatus, progress: number): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('invoices')
            .update({
                status,
                progress,
                last_update: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating invoice status:', error);
        return { success: false, error };
    }
};
// ========================================

// Price Calculator with Full Fee Structure
export const calculateFinalPrice = async (baseUSD: number): Promise<{
    buyingPriceKES: number;
    logisticsFeeKES: number;
    serviceFeeKES: number;
    totalKES: number;
    breakdown: string;
}> => {
    try {
        // Fetch exchange rate from app_settings
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'KES_PER_USD')
            .single();

        const KES_PER_USD = error ? 135 : parseFloat(data.value);

        // 1. Buying Price
        const buyingPriceKES = baseUSD * KES_PER_USD;

        // 2. Logistics Fee: $20 flat + 3.5% of item value
        const logisticsFeeUSD = 20 + (baseUSD * 0.035);
        const logisticsFeeKES = logisticsFeeUSD * KES_PER_USD;

        // 3. Service Fee (Conditional)
        let serviceFeeUSD;
        if (baseUSD <= 750) {
            serviceFeeUSD = 30; // Flat $30
        } else {
            serviceFeeUSD = baseUSD * 0.045; // 4.5% of value
        }
        const serviceFeeKES = serviceFeeUSD * KES_PER_USD;

        // 4. Total (Round UP)
        const totalKES = Math.ceil(buyingPriceKES + logisticsFeeKES + serviceFeeKES);

        return {
            buyingPriceKES: Math.round(buyingPriceKES),
            logisticsFeeKES: Math.round(logisticsFeeKES),
            serviceFeeKES: Math.round(serviceFeeKES),
            totalKES,
            breakdown: `Base: ${buyingPriceKES.toFixed(0)} + Logistics: ${logisticsFeeKES.toFixed(0)} + Service: ${serviceFeeKES.toFixed(0)} = ${totalKES} KES`
        };
    } catch (error) {
        console.error('Error calculating price:', error);
        throw error;
    }
};

// Product CRUD Operations
export const createProduct = async (productData: Partial<Product>): Promise<{ success: boolean; error?: any; id?: string }> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert({
                name: productData.name,
                price_kes: productData.priceKES,
                discount_price: productData.discountPriceKES,
                images: productData.imageUrls || [],
                description: productData.description,
                category: productData.category || 'Electronics',
                stock_status: productData.availability || 'In Stock',
                inventory_quantity: productData.stockCount || 0,
                shop_variants: productData.variations || []
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, id: data.id };
    } catch (error) {
        console.error('Error creating product:', error);
        return { success: false, error };
    }
};

export const updateProduct = async (productId: string, updates: Partial<Product>): Promise<{ success: boolean; error?: any }> => {
    try {
        const updateData: any = {};
        if (updates.name) updateData.name = updates.name;
        if (updates.priceKES) updateData.price_kes = updates.priceKES;
        if (updates.discountPriceKES !== undefined) updateData.discount_price = updates.discountPriceKES;
        if (updates.imageUrls) updateData.images = updates.imageUrls;
        if (updates.description) updateData.description = updates.description;
        if (updates.category) updateData.category = updates.category;
        if (updates.availability) updateData.stock_status = updates.availability;
        if (updates.stockCount !== undefined) updateData.inventory_quantity = updates.stockCount;
        if (updates.variations) updateData.shop_variants = updates.variations;

        const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error };
    }
};

export const deleteProduct = async (productId: string): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error };
    }
};

// Client Management
export const updateClient = async (clientId: string, updates: Partial<Client>): Promise<{ success: boolean; error?: any }> => {
    try {
        const updateData: any = {};
        if (updates.name) updateData.name = updates.name;
        if (updates.email) updateData.email = updates.email;
        if (updates.phone) updateData.phone = updates.phone;
        if (updates.location) updateData.location = updates.location;
        if (updates.interests) updateData.interests = updates.interests;
        if (updates.totalSpentKES !== undefined) updateData.total_spent_kes = updates.totalSpentKES;
        if (updates.orderCount !== undefined) updateData.order_count = updates.orderCount;
        if (updates.lastOrderDate) updateData.last_order_date = updates.lastOrderDate;
        if (updates.purchasedItems) updateData.purchased_items = updates.purchasedItems;
        if (updates.purchaseFrequency) updateData.purchase_frequency = updates.purchaseFrequency;

        const { error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', clientId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating client:', error);
        return { success: false, error };
    }
};

export const deleteClient = async (clientId: string): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting client:', error);
        return { success: false, error };
    }
};

// Consultation Management
export const updateConsultation = async (
    consultationId: string,
    status: ConsultationStatus
): Promise<{ success: boolean; error?: any }> => {
    try {
        // Map UI status back to database format
        let dbStatus = status as string;
        if (status === ConsultationStatus.PENDING) dbStatus = 'pending_approval';
        if (status === ConsultationStatus.DOABLE) dbStatus = 'doable';
        if (status === ConsultationStatus.PAID) dbStatus = 'paid';
        if (status === ConsultationStatus.CANCELLED) dbStatus = 'cancelled';

        const { error } = await supabase
            .from('consultations')
            .update({ status: dbStatus })
            .eq('id', consultationId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating consultation:', error);
        return { success: false, error };
    }
};

// Stock Status Helper (for Shop display)
export const getStockStatus = (quantity: number): string => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= 5) return 'Low Stock';
    if (quantity <= 15) return 'In Stock';
    return 'High Stock';
};

// Update Pricelist Item with Calculator
export const updatePricelistItem = async (
    variantId: string,
    priceUSD: number,
    manualOverride: boolean = false,
    manualKES?: number
): Promise<{ success: boolean; calculatedKES?: number; error?: any }> => {
    try {
        let priceKES = manualKES;

        if (!manualOverride) {
            // Auto-calculate using the price calculator
            const calculation = await calculateFinalPrice(priceUSD);
            priceKES = calculation.totalKES;
        }

        const updateData: any = {
            price_usd: priceUSD,
            last_updated: new Date().toISOString(),
            is_manual_override: manualOverride
        };

        if (priceKES) {
            updateData.price_kes = priceKES;
        }

        const { error } = await supabase
            .from('product_variants')
            .update(updateData)
            .eq('id', variantId);

        if (error) throw error;
        return { success: true, calculatedKES: priceKES };
    } catch (error) {
        console.error('Error updating pricelist item:', error);
        return { success: false, error };
    }
};

// Blog Management
export const createBlog = async (blogData: Partial<BlogPost>): Promise<{ success: boolean; error?: any; id?: string }> => {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .insert({
                title: blogData.title,
                excerpt: blogData.excerpt,
                content: blogData.content,
                image_url: blogData.imageUrl,
                category: blogData.category,
                author: blogData.author,
                date: blogData.date || new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, id: data.id };
    } catch (error) {
        console.error('Error creating blog:', error);
        return { success: false, error };
    }
};

export const updateBlog = async (blogId: string, updates: Partial<BlogPost>): Promise<{ success: boolean; error?: any }> => {
    try {
        const updateData: any = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.excerpt) updateData.excerpt = updates.excerpt;
        if (updates.content) updateData.content = updates.content;
        if (updates.imageUrl) updateData.image_url = updates.imageUrl;
        if (updates.category) updateData.category = updates.category;
        if (updates.author) updateData.author = updates.author;
        if (updates.date) updateData.date = updates.date;

        const { error } = await supabase
            .from('blogs')
            .update(updateData)
            .eq('id', blogId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating blog:', error);
        return { success: false, error };
    }
};

export const deleteBlog = async (blogId: string): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('blogs')
            .delete()
            .eq('id', blogId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting blog:', error);
        return { success: false, error };
    }
};

// Sourcing Management (Phase 4)
export const submitSourcingRequest = async (request: Partial<SourcingRequest>): Promise<{ success: boolean; error?: any; id?: number }> => {
    try {
        const { data, error } = await supabase
            .from('sourcing_requests')
            .insert({
                client_name: request.clientName,
                client_whatsapp: request.clientWhatsapp,
                product_name: request.productName,
                product_category: request.productCategory,
                product_link: request.productLink,
                estimated_quantity: request.estimatedQuantity || 1,
                shipping_preference: request.shippingPreference,
                item_type: request.itemType,
                target_budget_kes: request.targetBudgetKES,
                urgency: request.urgency || 'Medium',
                status: 'pending',
                // Shipping calculator fields
                shipping_weight: request.shippingWeight,
                package_length: request.packageLength,
                package_width: request.packageWidth,
                package_height: request.packageHeight,
                calculated_cbm: request.calculatedCBM,
                estimated_shipping_cost: request.estimatedShippingCost
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, id: data.id };
    } catch (error) {
        console.error('Error submitting sourcing request:', error);
        return { success: false, error };
    }
};

export const fetchSourcingRequests = async (): Promise<SourcingRequest[]> => {
    try {
        const { data, error } = await supabase
            .from('sourcing_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((r: any) => ({
            id: r.id,
            clientName: r.client_name,
            clientWhatsapp: r.client_whatsapp,
            productName: r.product_name,
            productCategory: r.product_category,
            productLink: r.product_link,
            estimatedQuantity: r.estimated_quantity,
            shippingPreference: r.shipping_preference,
            itemType: r.item_type,
            targetBudgetKES: r.target_budget_kes ? parseFloat(r.target_budget_kes) : undefined,
            urgency: r.urgency,
            status: r.status,
            createdAt: r.created_at
        }));
    } catch (error) {
        console.error('Error fetching sourcing requests:', error);
        return [];
    }
};

export const updateSourcingStatus = async (id: number, status: string): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await supabase
            .from('sourcing_requests')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating sourcing status:', error);
        return { success: false, error };
    }
};

// Payment & Invoice Management (Phase 5)
export const createInvoice = async (invoice: Partial<Invoice>): Promise<{ success: boolean; error?: any; id?: string }> => {
    try {
        console.log("💾 Recording Invoice for reference:", invoice.paystackReference);

        const { data, error } = await supabase
            .from('invoices')
            .insert({
                user_id: invoice.userId,
                client_name: invoice.clientName,
                product_name: invoice.productName,
                quantity: invoice.quantity || 1,
                total_kes: invoice.totalKES,
                is_paid: invoice.isPaid || false,
                status: invoice.status || OrderStatus.RECEIVED_BY_AGENT,
                invoice_number: invoice.invoiceNumber || `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                paystack_reference: invoice.paystackReference,
                progress: invoice.progress || 0
            })
            .select()
            .single();

        if (error) {
            console.error('CRITICAL: Invoice Persistence Failed:', error.message);
            throw error;
        }

        return { success: true, id: data.id };
    } catch (error: any) {
        return { success: false, error: error.message || error };
    }
};

export const verifyPaystackPayment = async (reference: string): Promise<{ success: boolean; data?: any; error?: any }> => {
    try {
        const { data, error } = await supabase.functions.invoke('verify-paystack', {
            body: { reference }
        });

        if (error) {
            // Enhanced error detection for unreachable functions
            if (error.message?.includes('Edge Function') || error.message?.includes('failed to fetch')) {
                return { success: false, error: { message: 'VERIFICATION_OFFLINE', details: error.message } };
            }
            throw error;
        }
        return { success: true, data };
    } catch (error: any) {
        console.error('Error verifying Paystack payment:', error);
        return { success: false, error: { message: error.message || 'Unknown verification error' } };
    }
};
