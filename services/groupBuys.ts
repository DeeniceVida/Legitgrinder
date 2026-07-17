import { supabase } from '../lib/supabase';

export interface GroupCampaign {
  id: string;
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;
  unitPriceKES: number;
  minDepositKES: number;   // minimum deposit PER UNIT
  whatsappGroupLink?: string;
  status: string;
  closesAt?: string;       // ISO deadline — after this, no more payments
}

export interface GroupOrder {
  id: string;
  campaignId: string;
  orderCode: string;
  clientName?: string;
  clientWhatsapp?: string;
  clientEmail?: string;
  units: number;
  totalKES: number;
  amountPaidKES: number;
  joinedGroup: boolean;
  createdAt?: string;
}

/** Public: load a campaign by its shareable slug. */
export const fetchGroupCampaign = async (slug: string): Promise<GroupCampaign | null> => {
  const { data, error } = await supabase
    .from('group_campaigns')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description || undefined,
    imageUrl: data.image_url || undefined,
    unitPriceKES: Number(data.unit_price_kes) || 0,
    minDepositKES: Number(data.min_deposit_kes) || 0,
    whatsappGroupLink: data.whatsapp_group_link || undefined,
    status: data.status || 'open',
    closesAt: data.closes_at || undefined
  };
};

/** Public: record a client's reservation after they pay (via SECURITY DEFINER RPC). */
export const recordGroupOrder = async (args: {
  campaignId: string; clientName: string; clientWhatsapp: string; clientEmail: string;
  units: number; totalKES: number; amountPaidKES: number; paystackReference: string;
}): Promise<{ success: boolean; orderCode?: string; error?: string }> => {
  const { data, error } = await supabase.rpc('record_group_order', {
    p_campaign_id: args.campaignId,
    p_client_name: args.clientName,
    p_client_whatsapp: args.clientWhatsapp,
    p_client_email: args.clientEmail,
    p_units: args.units,
    p_total_kes: args.totalKES,
    p_amount_paid_kes: args.amountPaidKES,
    p_paystack_reference: args.paystackReference
  });
  if (error) return { success: false, error: error.message };
  return { success: true, orderCode: data as string };
};

/** Public: flag that the client tapped through to join the WhatsApp group. */
export const markGroupJoined = async (orderCode: string): Promise<void> => {
  await supabase.rpc('mark_group_order_joined', { p_order_code: orderCode }).then(undefined, () => {});
};

// ── Admin (signed-in) ──────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'campaign';

/** Admin: list all campaigns, newest first. */
export const fetchGroupCampaigns = async (): Promise<GroupCampaign[]> => {
  const { data, error } = await supabase
    .from('group_campaigns').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((d: any) => ({
    id: d.id, slug: d.slug, title: d.title,
    description: d.description || undefined, imageUrl: d.image_url || undefined,
    unitPriceKES: Number(d.unit_price_kes) || 0, minDepositKES: Number(d.min_deposit_kes) || 0,
    whatsappGroupLink: d.whatsapp_group_link || undefined, status: d.status || 'open',
    closesAt: d.closes_at || undefined
  }));
};

/** Admin: all reservations (optionally for one campaign), newest first. */
export const fetchGroupOrders = async (campaignId?: string): Promise<GroupOrder[]> => {
  let q = supabase.from('group_orders').select('*').order('created_at', { ascending: false });
  if (campaignId) q = q.eq('campaign_id', campaignId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((d: any) => ({
    id: d.id, campaignId: d.campaign_id, orderCode: d.order_code,
    clientName: d.client_name || undefined, clientWhatsapp: d.client_whatsapp || undefined,
    clientEmail: d.client_email || undefined, units: d.units || 1,
    totalKES: Number(d.total_kes) || 0, amountPaidKES: Number(d.amount_paid_kes) || 0,
    joinedGroup: !!d.joined_group, createdAt: d.created_at
  }));
};

/** Admin: create a campaign. Auto-slugs from the title if no slug is given. */
export const createGroupCampaign = async (c: {
  title: string; description?: string; imageUrl?: string;
  unitPriceKES: number; minDepositKES: number; slug?: string;
  whatsappGroupLink?: string; closesAt?: string | null;
}): Promise<{ success: boolean; slug?: string; error?: string }> => {
  const slug = (c.slug && slugify(c.slug)) || `${slugify(c.title)}-${Math.random().toString(36).slice(2, 5)}`;
  const { error } = await supabase.from('group_campaigns').insert({
    slug, title: c.title, description: c.description || null, image_url: c.imageUrl || null,
    unit_price_kes: c.unitPriceKES, min_deposit_kes: c.minDepositKES,
    whatsapp_group_link: c.whatsappGroupLink || null, status: 'open',
    closes_at: c.closesAt || null
  });
  if (error) return { success: false, error: error.message };
  return { success: true, slug };
};

/** Admin: edit an existing campaign's editable fields. */
export const updateGroupCampaign = async (id: string, c: {
  title?: string; description?: string; imageUrl?: string;
  unitPriceKES?: number; minDepositKES?: number;
  whatsappGroupLink?: string; closesAt?: string | null;
}): Promise<{ success: boolean; error?: string }> => {
  const payload: any = {};
  if (c.title !== undefined) payload.title = c.title;
  if (c.description !== undefined) payload.description = c.description || null;
  if (c.imageUrl !== undefined) payload.image_url = c.imageUrl || null;
  if (c.unitPriceKES !== undefined) payload.unit_price_kes = c.unitPriceKES;
  if (c.minDepositKES !== undefined) payload.min_deposit_kes = c.minDepositKES;
  if (c.whatsappGroupLink !== undefined) payload.whatsapp_group_link = c.whatsappGroupLink || null;
  if (c.closesAt !== undefined) payload.closes_at = c.closesAt || null;
  const { error } = await supabase.from('group_campaigns').update(payload).eq('id', id);
  return { success: !error, error: error?.message };
};

/** Admin: open / close a campaign. */
export const setGroupCampaignStatus = async (id: string, status: 'open' | 'closed') => {
  const { error } = await supabase.from('group_campaigns').update({ status }).eq('id', id);
  return { success: !error, error: error?.message };
};
