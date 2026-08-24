import { supabase } from '../lib/supabase';

/**
 * WhatsApp enquiries.
 *
 * A shopper who taps "Order via WhatsApp" leaves the site, and whatever
 * happens next happens on the owner's phone. Without a record, stock drifts:
 * pieces get sold and the shop keeps offering them. Logging the handoff means
 * the dashboard can ask, a day later, whether it became a sale.
 */

export interface ProductEnquiry {
  id: string;
  productId?: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPriceKES?: number;
  status: 'open' | 'bought' | 'lost';
  adminNotes?: string;
  stockAdjusted: boolean;
  createdAt: string;
}

/**
 * Record a handoff to WhatsApp. Deliberately silent: a customer must never see
 * an error, or be delayed, because our bookkeeping failed.
 */
export const logProductEnquiry = async (e: {
  productId?: string;
  productName: string;
  variant?: string;
  quantity?: number;
  unitPriceKES?: number;
}): Promise<void> => {
  try {
    await supabase.from('product_enquiries').insert({
      product_id: e.productId ?? null,
      product_name: e.productName,
      variant: e.variant ?? null,
      quantity: e.quantity ?? 1,
      unit_price_kes: e.unitPriceKES ?? null,
    });
  } catch {
    // Swallowed on purpose — see above.
  }
};

const toEnquiry = (d: any): ProductEnquiry => ({
  id: d.id,
  productId: d.product_id || undefined,
  productName: d.product_name,
  variant: d.variant || undefined,
  quantity: d.quantity ?? 1,
  unitPriceKES: d.unit_price_kes != null ? Number(d.unit_price_kes) : undefined,
  status: ['open', 'bought', 'lost'].includes(d.status) ? d.status : 'open',
  adminNotes: d.admin_notes || undefined,
  stockAdjusted: d.stock_adjusted === true,
  createdAt: d.created_at,
});

/** Admin: enquiries, newest first. */
export const fetchProductEnquiries = async (limit = 100): Promise<ProductEnquiry[]> => {
  try {
    const { data, error } = await supabase
      .from('product_enquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(toEnquiry);
  } catch {
    return [];
  }
};

export const setEnquiryOutcome = async (
  id: string,
  status: 'bought' | 'lost' | 'open',
  stockAdjusted?: boolean
): Promise<{ success: boolean; error?: string }> => {
  const row: any = {
    status,
    resolved_at: status === 'open' ? null : new Date().toISOString(),
  };
  if (stockAdjusted !== undefined) row.stock_adjusted = stockAdjusted;
  const { error } = await supabase.from('product_enquiries').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

export const deleteEnquiry = async (id: string): Promise<{ success: boolean }> => {
  const { error } = await supabase.from('product_enquiries').delete().eq('id', id);
  return { success: !error };
};

/** Hours since the enquiry came in. */
export const ageHours = (e: ProductEnquiry): number =>
  (Date.now() - new Date(e.createdAt).getTime()) / 36e5;

/**
 * Enquiries old enough to chase. A day is the owner's own rule of thumb: long
 * enough for the conversation to have concluded, short enough that he still
 * remembers it.
 */
export const needsFollowUp = (e: ProductEnquiry): boolean =>
  e.status === 'open' && ageHours(e) >= 24;
