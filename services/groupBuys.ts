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
    status: data.status || 'open'
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
