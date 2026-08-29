import { supabase } from '../lib/supabase';
import { logSentEmail } from './sentEmails';

/** A colour a buyer can pick. Purely a choice — it never changes the price. */
export interface GroupColor {
  name: string;
  imageUrl?: string;
}

export interface GroupCampaign {
  id: string;
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;        // legacy single cover image (older campaigns)
  imageUrls?: string[];     // gallery — first one is the cover
  videoUrl?: string;        // TikTok / YouTube / Instagram link
  shippingMode?: 'air' | 'sea';  // drives the ETA shown on the poster
  colors?: GroupColor[];         // choices only — colours never change the price
  unitPriceKES: number;
  minDepositKES: number;   // minimum deposit PER UNIT
  whatsappGroupLink?: string;
  status: string;
  closesAt?: string;       // ISO deadline — after this, no more payments
  arrivedAt?: string;      // set when stock lands and balances are called in
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
  color?: string;
  createdAt?: string;
}

/**
 * Row → GroupCampaign. Falls back to the legacy single `image_url` so campaigns
 * created before the gallery migration still show their cover.
 */
const toCampaign = (d: any): GroupCampaign => {
  const gallery: string[] = Array.isArray(d.image_urls) ? d.image_urls.filter(Boolean) : [];
  if (gallery.length === 0 && d.image_url) gallery.push(d.image_url);
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    description: d.description || undefined,
    imageUrl: d.image_url || gallery[0] || undefined,
    imageUrls: gallery,
    videoUrl: d.video_url || undefined,
    shippingMode: d.shipping_mode === 'sea' ? 'sea' : 'air',
    colors: Array.isArray(d.colors)
      ? d.colors.filter((c: any) => c && c.name).map((c: any) => ({ name: String(c.name), imageUrl: c.imageUrl || undefined }))
      : [],
    unitPriceKES: Number(d.unit_price_kes) || 0,
    minDepositKES: Number(d.min_deposit_kes) || 0,
    whatsappGroupLink: d.whatsapp_group_link || undefined,
    status: d.status || 'open',
    closesAt: d.closes_at || undefined,
    arrivedAt: d.arrived_at || undefined
  };
};

/** Public: load a campaign by its shareable slug. */
export const fetchGroupCampaign = async (slug: string): Promise<GroupCampaign | null> => {
  const { data, error } = await supabase
    .from('group_campaigns')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return toCampaign(data);
};

/** Public: record a client's reservation after they pay (via SECURITY DEFINER RPC). */
export const recordGroupOrder = async (args: {
  campaignId: string; clientName: string; clientWhatsapp: string; clientEmail: string;
  units: number; totalKES: number; amountPaidKES: number; paystackReference: string;
  color?: string;
}): Promise<{ success: boolean; orderCode?: string; error?: string }> => {
  const base = {
    p_campaign_id: args.campaignId,
    p_client_name: args.clientName,
    p_client_whatsapp: args.clientWhatsapp,
    p_client_email: args.clientEmail,
    p_units: args.units,
    p_total_kes: args.totalKES,
    p_amount_paid_kes: args.amountPaidKES,
    p_paystack_reference: args.paystackReference
  };
  const { data, error } = await supabase.rpc('record_group_order', { ...base, p_color: args.color || null });
  if (!error) return { success: true, orderCode: data as string };

  // The colour migration may not be applied yet — never lose a paid reservation
  // over it: retry without the colour rather than failing the order.
  if (/p_color|record_group_order/.test(error.message || '')) {
    const retry = await supabase.rpc('record_group_order', base);
    if (!retry.error) return { success: true, orderCode: retry.data as string };
    return { success: false, error: retry.error.message };
  }
  return { success: false, error: error.message };
};

/** What the public balance-pay page is allowed to see about an order. */
export interface PublicGroupOrder {
  orderCode: string;
  clientName?: string;
  campaignTitle: string;
  units: number;
  color?: string;
  totalKES: number;
  amountPaidKES: number;
  balanceKES: number;
  arrived: boolean;
}

/** Public: look up one order by its code (SECURITY DEFINER — no contact details). */
export const fetchGroupOrderByCode = async (code: string): Promise<PublicGroupOrder | null> => {
  try {
    const { data, error } = await supabase.rpc('get_group_order', { p_code: code });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return null;
    return {
      orderCode: row.order_code,
      clientName: row.client_name || undefined,
      campaignTitle: row.campaign_title,
      units: row.units || 1,
      color: row.color || undefined,
      totalKES: Number(row.total_kes) || 0,
      amountPaidKES: Number(row.amount_paid_kes) || 0,
      balanceKES: Number(row.balance_kes) || 0,
      arrived: !!row.arrived,
    };
  } catch {
    return null;
  }
};

/** Public: record a balance payment against the buyer's own order. */
export const recordGroupBalancePayment = async (
  code: string, amountKES: number, reference: string
): Promise<{ success: boolean; balanceKES?: number; fullyPaid?: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('record_group_balance_payment', {
      p_code: code, p_amount: Math.round(amountKES), p_reference: reference
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return { success: false, error: error?.message || 'Could not record the payment.' };
    return { success: true, balanceKES: Number(row.balance_kes) || 0, fullyPaid: !!row.fully_paid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/** Admin: mark the campaign's stock as landed (drives the balance emails). */
export const markCampaignArrived = async (id: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('group_campaigns')
    .update({ arrived_at: new Date().toISOString() })
    .eq('id', id);
  if (error && /arrived_at/.test(error.message)) {
    return { success: false, error: 'Run add_group_balance_payments.sql in Supabase first — the arrived_at column does not exist yet.' };
  }
  return { success: !error, error: error?.message };
};

/** Admin: email every buyer with an outstanding balance their own pay link. */
export const sendGroupBalanceEmails = async (args: {
  campaignTitle: string;
  imageUrl?: string;
  collectionNote?: string;
  deliveryUrl?: string;
  recipients: {
    email: string; name?: string; orderCode: string; units?: number; color?: string;
    totalKES: number; paidKES: number; balanceKES: number; payUrl: string;
  }[];
}): Promise<{ success: boolean; sent?: number; skipped?: number; error?: string }> => {
  try {
    const res = await fetch('/api/group-balance-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const data = await res.json();
    const emails = (args.recipients || []).map(r => r.email).filter(Boolean);
    if (!res.ok || !data.success) {
      logSentEmail({ kind: 'group-balance', recipient: emails, status: 'failed', error: data.error, reference: args.campaignTitle });
      return { success: false, error: data.error || 'The emails could not be sent.' };
    }
    logSentEmail({ kind: 'group-balance', recipient: emails, subject: `Balance due · ${args.campaignTitle || 'group buy'}`, status: 'sent', reference: args.campaignTitle });
    return { success: true, sent: data.sent, skipped: data.skipped };
  } catch (e: any) {
    return { success: false, error: e.message || 'Could not reach the email service (live site only).' };
  }
};

/** Public: flag that the client tapped through to join the WhatsApp group. */
export const markGroupJoined = async (orderCode: string): Promise<void> => {
  await supabase.rpc('mark_group_order_joined', { p_order_code: orderCode }).then(undefined, () => {});
};

// ── Admin (signed-in) ──────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'campaign';

/**
 * A pasted supplier URL must never become the public link — that would put
 * "alibaba.com/product-detail/..." in the address customers see. Anything that
 * looks like a URL or carries a domain is rejected so we fall back to the title.
 */
const looksLikeUrl = (s: string) =>
  /^https?:\/\//i.test(s.trim()) || /\b[a-z0-9-]+\.(com|net|org|cn|co|io|shop|store)\b/i.test(s);

/** Build a safe public slug: use the admin's code only if it isn't a URL. */
const safeSlug = (rawSlug: string | undefined, title: string): string => {
  const candidate = (rawSlug || '').trim();
  if (candidate && !looksLikeUrl(candidate)) return slugify(candidate);
  // Fall back to the title — also stripped of any URL fragments.
  const cleanTitle = title.replace(/https?:\/\/\S+/gi, ' ').trim();
  return `${slugify(cleanTitle || 'campaign')}-${Math.random().toString(36).slice(2, 5)}`;
};

/** Admin: list all campaigns, newest first. */
export const fetchGroupCampaigns = async (): Promise<GroupCampaign[]> => {
  const { data, error } = await supabase
    .from('group_campaigns').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(toCampaign);
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
    joinedGroup: !!d.joined_group, color: d.color || undefined, createdAt: d.created_at
  }));
};

/** Admin: create a campaign. Auto-slugs from the title if no slug is given. */
export const createGroupCampaign = async (c: {
  title: string; description?: string; imageUrl?: string; imageUrls?: string[];
  videoUrl?: string; shippingMode?: 'air' | 'sea'; colors?: GroupColor[];
  unitPriceKES: number; minDepositKES: number; slug?: string;
  whatsappGroupLink?: string; closesAt?: string | null;
}): Promise<{ success: boolean; slug?: string; error?: string; warning?: string }> => {
  const slug = safeSlug(c.slug, c.title);
  const gallery = (c.imageUrls || []).filter(Boolean);
  const base = {
    slug, title: c.title, description: c.description || null,
    // Keep the legacy single column in sync so nothing depending on it breaks.
    image_url: c.imageUrl || gallery[0] || null,
    unit_price_kes: c.unitPriceKES, min_deposit_kes: c.minDepositKES,
    whatsapp_group_link: c.whatsappGroupLink || null, status: 'open',
    closes_at: c.closesAt || null
  };
  const { error } = await supabase.from('group_campaigns').insert({
    ...base,
    image_urls: gallery.length ? gallery : null,
    video_url: c.videoUrl || null,
    shipping_mode: c.shippingMode || 'air',
    colors: c.colors && c.colors.length ? c.colors : null,
  });
  if (!error) return { success: true, slug };
  // The gallery/video/colours migration may not be applied yet — still create
  // the campaign rather than blocking, but SAY SO instead of silently dropping
  // the fields (which looks like the feature is broken).
  if (isMissingMediaColumn(error.message)) {
    const { error: retryErr } = await supabase.from('group_campaigns').insert(base);
    if (!retryErr) return { success: true, slug, warning: missingMigrationWarning(error.message) };
    return { success: false, error: retryErr.message };
  }
  return { success: false, error: error.message };
};

/** Plain-English note telling the admin which SQL file still needs running. */
const missingMigrationWarning = (msg?: string) => {
  const needsColors = /colors/.test(msg || '');
  const file = needsColors ? 'add_group_buy_colors.sql' : 'add_group_buy_media.sql';
  const what = needsColors ? 'Colour options were NOT saved' : 'Images/video were NOT saved';
  return `${what} — the database is missing those columns. Run ${file} in the Supabase SQL editor, then edit this campaign and add them again.`;
};

/** True when the DB is missing the image_urls / video_url columns. */
const isMissingMediaColumn = (msg?: string) =>
  !!msg && /image_urls|video_url|shipping_mode|colors/.test(msg) && /does not exist|schema cache/i.test(msg);

/** Admin: edit an existing campaign's editable fields. */
export const updateGroupCampaign = async (id: string, c: {
  slug?: string;
  title?: string; description?: string; imageUrl?: string; imageUrls?: string[];
  videoUrl?: string; shippingMode?: 'air' | 'sea'; colors?: GroupColor[];
  unitPriceKES?: number; minDepositKES?: number;
  whatsappGroupLink?: string; closesAt?: string | null;
}): Promise<{ success: boolean; error?: string; warning?: string }> => {
  const payload: any = {};
  if (c.slug !== undefined && c.slug.trim()) payload.slug = safeSlug(c.slug, c.title || '');
  if (c.title !== undefined) payload.title = c.title;
  if (c.description !== undefined) payload.description = c.description || null;
  if (c.imageUrls !== undefined) {
    const gallery = (c.imageUrls || []).filter(Boolean);
    payload.image_urls = gallery.length ? gallery : null;
    payload.image_url = gallery[0] || null;   // keep the legacy cover in sync
  }
  if (c.videoUrl !== undefined) payload.video_url = c.videoUrl || null;
  if (c.shippingMode !== undefined) payload.shipping_mode = c.shippingMode;
  if (c.colors !== undefined) payload.colors = c.colors.length ? c.colors : null;
  if (c.imageUrl !== undefined && c.imageUrls === undefined) payload.image_url = c.imageUrl || null;
  if (c.unitPriceKES !== undefined) payload.unit_price_kes = c.unitPriceKES;
  if (c.minDepositKES !== undefined) payload.min_deposit_kes = c.minDepositKES;
  if (c.whatsappGroupLink !== undefined) payload.whatsapp_group_link = c.whatsappGroupLink || null;
  if (c.closesAt !== undefined) payload.closes_at = c.closesAt || null;
  const { error } = await supabase.from('group_campaigns').update(payload).eq('id', id);
  if (!error) return { success: true };
  // Same graceful fallback as create: save everything except the media columns
  // if the migration hasn't been run yet.
  if (isMissingMediaColumn(error.message)) {
    const { image_urls, video_url, shipping_mode, colors, ...rest } = payload;
    const { error: retryErr } = await supabase.from('group_campaigns').update(rest).eq('id', id);
    if (retryErr) return { success: false, error: retryErr.message };
    return { success: true, warning: missingMigrationWarning(error.message) };
  }
  return { success: false, error: error.message };
};

/** Admin: open / close a campaign. */
export const setGroupCampaignStatus = async (id: string, status: 'open' | 'closed') => {
  const { error } = await supabase.from('group_campaigns').update({ status }).eq('id', id);
  return { success: !error, error: error?.message };
};
