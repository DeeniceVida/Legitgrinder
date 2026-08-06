import { supabase } from '../lib/supabase';

export interface CorporateCategory {
  id: string;
  name: string;
  blurb?: string;
  minKES?: number;
  maxKES?: number;
  moq: number;
  isActive: boolean;
  sortOrder: number;
}

export interface CorporateQuote {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  whatsapp?: string;
  location?: string;
  categories: string[];
  quantityBand?: string;
  budgetBand?: string;
  timeline?: string;
  notes?: string;
  estimateLow?: number;
  estimateHigh?: number;
  leadQuality: 'priority' | 'low';
  status: 'new' | 'quoted' | 'won' | 'lost';
  adminNotes?: string;
  /** 'business' | 'project'. Used to ride inside notes before it had a column. */
  buyerType?: string;
  /** The schedule they configured in the catalogue, if any. */
  lineItems?: QuoteLine[];
  createdAt: string;
}

/** One configured catalogue line as stored on the quote. */
export interface QuoteLine {
  code: string;
  name: string;
  color?: string;
  qty: number;
  unitKES?: number | null;
}

const toCategory = (d: any): CorporateCategory => ({
  id: d.id,
  name: d.name,
  blurb: d.blurb || undefined,
  minKES: d.min_kes != null ? Number(d.min_kes) : undefined,
  maxKES: d.max_kes != null ? Number(d.max_kes) : undefined,
  moq: d.moq ?? 5,
  isActive: d.is_active !== false,
  sortOrder: d.sort_order ?? 0,
});

/** Public: the categories shown on /corporate. */
export const fetchCorporateCategories = async (activeOnly = true): Promise<CorporateCategory[]> => {
  try {
    let q = supabase.from('corporate_categories').select('*').order('sort_order');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(toCategory);
  } catch {
    return [];
  }
};

export const upsertCorporateCategory = async (c: Partial<CorporateCategory> & { name: string }): Promise<{ success: boolean; error?: string }> => {
  const payload: any = {
    name: c.name.trim(),
    blurb: c.blurb || null,
    min_kes: c.minKES ?? null,
    max_kes: c.maxKES ?? null,
    moq: c.moq ?? 5,
    is_active: c.isActive !== false,
    sort_order: c.sortOrder ?? 0,
  };
  const { error } = c.id
    ? await supabase.from('corporate_categories').update(payload).eq('id', c.id)
    : await supabase.from('corporate_categories').insert(payload);
  return { success: !error, error: error?.message };
};

export const deleteCorporateCategory = async (id: string) => {
  const { error } = await supabase.from('corporate_categories').delete().eq('id', id);
  return { success: !error };
};

/**
 * Public: submit a request. Guests can insert but not read back (RLS), so we
 * don't rely on the returned row.
 */
export const submitCorporateQuote = async (q: {
  fullName: string; businessName: string; email: string; whatsapp?: string; location?: string;
  categories: string[]; quantityBand?: string; budgetBand?: string; timeline?: string;
  notes?: string; estimateLow?: number; estimateHigh?: number; leadQuality: 'priority' | 'low';
  buyerType?: string; lineItems?: QuoteLine[];
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('corporate_quotes').insert({
      full_name: q.fullName.trim(),
      business_name: q.businessName.trim(),
      email: q.email.trim().toLowerCase(),
      whatsapp: q.whatsapp || null,
      location: q.location || null,
      categories: q.categories,
      quantity_band: q.quantityBand || null,
      budget_band: q.budgetBand || null,
      timeline: q.timeline || null,
      notes: q.notes || null,
      estimate_low: q.estimateLow ?? null,
      estimate_high: q.estimateHigh ?? null,
      lead_quality: q.leadQuality,
      buyer_type: q.buyerType || null,
      line_items: q.lineItems?.length ? q.lineItems : null,
    });
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    const msg = e.message || '';
    // buyer_type / line_items arrive with add_chair_catalog.sql. If that hasn't
    // been run yet, a real enquiry must still get through — so fold the schedule
    // into notes and submit against the original columns.
    if (/buyer_type|line_items/.test(msg)) {
      const fallbackNotes = [
        q.notes,
        q.buyerType ? `Buying as: ${q.buyerType}` : '',
        q.lineItems?.length
          ? 'Schedule:\n' + q.lineItems.map(l => `  ${l.qty} × ${l.name}${l.color ? ` (${l.color})` : ''}`).join('\n')
          : '',
      ].filter(Boolean).join('\n');
      const { error } = await supabase.from('corporate_quotes').insert({
        full_name: q.fullName.trim(),
        business_name: q.businessName.trim(),
        email: q.email.trim().toLowerCase(),
        whatsapp: q.whatsapp || null,
        location: q.location || null,
        categories: q.categories,
        quantity_band: q.quantityBand || null,
        budget_band: q.budgetBand || null,
        timeline: q.timeline || null,
        notes: fallbackNotes || null,
        estimate_low: q.estimateLow ?? null,
        estimate_high: q.estimateHigh ?? null,
        lead_quality: q.leadQuality,
      });
      if (!error) return { success: true };
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: /relation .* does not exist|schema cache/i.test(msg)
        ? 'The corporate_quotes table does not exist yet — run add_corporate_quotes.sql in Supabase.'
        : (msg || 'Could not submit your request.'),
    };
  }
};

/** Admin: every request, newest first. */
export const fetchCorporateQuotes = async (): Promise<CorporateQuote[]> => {
  try {
    const { data, error } = await supabase
      .from('corporate_quotes').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      fullName: d.full_name,
      businessName: d.business_name,
      email: d.email,
      whatsapp: d.whatsapp || undefined,
      location: d.location || undefined,
      categories: Array.isArray(d.categories) ? d.categories : [],
      quantityBand: d.quantity_band || undefined,
      budgetBand: d.budget_band || undefined,
      timeline: d.timeline || undefined,
      notes: d.notes || undefined,
      estimateLow: d.estimate_low != null ? Number(d.estimate_low) : undefined,
      estimateHigh: d.estimate_high != null ? Number(d.estimate_high) : undefined,
      leadQuality: d.lead_quality === 'low' ? 'low' : 'priority',
      status: (['new', 'quoted', 'won', 'lost'].includes(d.status) ? d.status : 'new'),
      adminNotes: d.admin_notes || undefined,
      buyerType: d.buyer_type || undefined,
      lineItems: Array.isArray(d.line_items) ? d.line_items : undefined,
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
};

export const setCorporateQuoteStatus = async (id: string, status: CorporateQuote['status']) => {
  const { error } = await supabase.from('corporate_quotes').update({ status }).eq('id', id);
  return { success: !error, error: error?.message };
};

/** Fire the admin notification + the buyer's auto-reply (live site only). */
export const notifyCorporateQuote = async (payload: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/corporate-quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    return res.ok && data.success ? { success: true } : { success: false, error: data.error };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
