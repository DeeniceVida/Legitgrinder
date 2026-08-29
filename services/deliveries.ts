import { supabase } from '../lib/supabase';

/**
 * Rider deliveries.
 *
 * Admin reads and writes the table directly under RLS. Riders and customers
 * hold only an unguessable token and go through SECURITY DEFINER functions —
 * see add_deliveries.sql. Nothing here should ever query the table on their
 * behalf, or a leaked link would expose the whole roster.
 */

export type DeliveryStatus = 'assigned' | 'collected' | 'delivered';

/**
 * What a rider or customer is allowed to see when something breaks. The raw
 * Postgres text names our functions and schema, which is nobody else's
 * business — the real error goes to the console for us.
 */
const friendly = (raw?: string): string =>
  /schema cache|does not exist|function public./i.test(raw || '')
    ? 'Deliveries are not switched on yet. Please contact LegitGrinder.'
    : 'Something went wrong loading this. Please try again, or contact LegitGrinder.';

export interface Delivery {
  id: string;
  riderId?: string;
  riderName?: string;
  customerToken: string;
  customerName?: string;
  customerPhone?: string;
  itemDescription?: string;
  invoiceNumber?: string;
  originId: string;
  dropLat?: number;
  dropLng?: number;
  dropLabel?: string;
  distanceKm?: number;
  isBulky: boolean;
  deliveryFeeKES?: number;
  status: DeliveryStatus;
  parcelService?: string;
  parcelFeeKES?: number;
  parcelRef?: string;
  parcelReceiptUrl?: string;
  /** admin = you created it · customer = they booked it themselves. */
  source?: string;
  riderNotes?: string;
  notes?: string;
  collectedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

const toDelivery = (d: any): Delivery => ({
  id: d.id,
  riderId: d.rider_id || undefined,
  riderName: d.riders?.name || undefined,
  customerToken: d.customer_token,
  customerName: d.customer_name || undefined,
  customerPhone: d.customer_phone || undefined,
  itemDescription: d.item_description || undefined,
  invoiceNumber: d.invoice_number || undefined,
  originId: d.origin_id || 'cbd',
  dropLat: d.drop_lat != null ? Number(d.drop_lat) : undefined,
  dropLng: d.drop_lng != null ? Number(d.drop_lng) : undefined,
  dropLabel: d.drop_label || undefined,
  distanceKm: d.distance_km != null ? Number(d.distance_km) : undefined,
  isBulky: d.is_bulky === true,
  deliveryFeeKES: d.delivery_fee_kes != null ? Number(d.delivery_fee_kes) : undefined,
  status: (['assigned', 'collected', 'delivered'].includes(d.status) ? d.status : 'assigned') as DeliveryStatus,
  parcelService: d.parcel_service || undefined,
  parcelFeeKES: d.parcel_fee_kes != null ? Number(d.parcel_fee_kes) : undefined,
  parcelRef: d.parcel_ref || undefined,
  parcelReceiptUrl: d.parcel_receipt_url || undefined,
  source: d.source || undefined,
  riderNotes: d.rider_notes || undefined,
  notes: d.notes || undefined,
  collectedAt: d.collected_at || undefined,
  deliveredAt: d.delivered_at || undefined,
  createdAt: d.created_at,
});

/* ── Admin ──────────────────────────────────────────────────────────────── */

export const fetchDeliveries = async (limit = 100): Promise<Delivery[]> => {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, riders(name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(toDelivery);
  } catch {
    return [];
  }
};

export const createDelivery = async (d: {
  riderId?: string;
  customerName?: string;
  customerPhone?: string;
  itemDescription?: string;
  invoiceNumber?: string;
  originId: string;
  dropLat?: number;
  dropLng?: number;
  dropLabel?: string;
  distanceKm?: number;
  isBulky?: boolean;
  deliveryFeeKES?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; customerToken?: string }> => {
  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      rider_id: d.riderId || null,
      customer_name: d.customerName || null,
      customer_phone: d.customerPhone || null,
      item_description: d.itemDescription || null,
      invoice_number: d.invoiceNumber || null,
      origin_id: d.originId,
      drop_lat: d.dropLat ?? null,
      drop_lng: d.dropLng ?? null,
      drop_label: d.dropLabel || null,
      distance_km: d.distanceKm ?? null,
      is_bulky: d.isBulky || false,
      delivery_fee_kes: d.deliveryFeeKES ?? null,
      notes: d.notes || null,
    })
    .select('customer_token')
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, customerToken: data?.customer_token };
};

export const updateDelivery = async (id: string, patch: Partial<Delivery>) => {
  const row: any = {};
  if (patch.riderId !== undefined) row.rider_id = patch.riderId || null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.deliveryFeeKES !== undefined) row.delivery_fee_kes = patch.deliveryFeeKES ?? null;
  if (patch.notes !== undefined) row.notes = patch.notes || null;
  const { error } = await supabase.from('deliveries').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

export const deleteDelivery = async (id: string) => {
  const { error } = await supabase.from('deliveries').delete().eq('id', id);
  return { success: !error, error: error?.message };
};

/** Revoke and reissue a rider's link — the old one stops working immediately. */
export const rotateRiderToken = async (riderId: string) => {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const { error } = await supabase.from('riders').update({ access_token: token }).eq('id', riderId);
  return { success: !error, error: error?.message, token };
};

/* ── Rider (token only, no account) ─────────────────────────────────────── */

export interface RiderJobsResult {
  ok: boolean;
  error?: string;
  /** The link is valid but a PIN is needed — ask, do not show a failure. */
  needsPin?: boolean;
  riderName?: string;
  earned30d?: number;
  jobs: Delivery[];
}

export const fetchRiderJobs = async (token: string, pin?: string): Promise<RiderJobsResult> => {
  try {
    const { data, error } = await supabase.rpc('rider_jobs', { p_token: token, p_pin: pin ?? null });
    if (error) {
      console.error('rider_jobs failed:', error.message);
      return { ok: false, error: friendly(error.message), jobs: [] };
    }
    if (!data?.ok) {
      return {
        ok: false,
        needsPin: data?.needsPin === true,
        riderName: data?.riderName,
        error: data?.error || (data?.needsPin ? undefined : 'That link did not work.'),
        jobs: [],
      };
    }
    return {
      ok: true,
      riderName: data.rider?.name,
      earned30d: data.earned30d ?? 0,
      jobs: (data.jobs || []).map(toDelivery),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not load your jobs.', jobs: [] };
  }
};

export const riderUpdateJob = async (
  token: string,
  deliveryId: string,
  pin: string | undefined,
  patch: {
    status?: DeliveryStatus;
    parcelService?: string;
    parcelFeeKES?: number;
    parcelRef?: string;
    receiptUrl?: string;
    notes?: string;
  },
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('rider_update_job', {
      p_token: token,
      p_delivery_id: deliveryId,
      p_pin: pin ?? null,
      p_status: patch.status ?? null,
      p_service: patch.parcelService ?? null,
      p_parcel_fee: patch.parcelFeeKES ?? null,
      p_parcel_ref: patch.parcelRef ?? null,
      p_receipt_url: patch.receiptUrl ?? null,
      p_notes: patch.notes ?? null,
    });
    if (error) {
      console.error('rider_update_job failed:', error.message);
      return { ok: false, error: friendly(error.message) };
    }
    return { ok: !!data?.ok, error: data?.error };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not save that.' };
  }
};

/**
 * Put a photo of the courier receipt in the bucket and hand back its URL.
 *
 * Named with a random prefix rather than anything guessable, and never
 * overwritten — a receipt is evidence, so a second upload becomes a second
 * file rather than replacing the first.
 */
export const uploadReceipt = async (
  file: File,
  deliveryId: string,
): Promise<{ url?: string; error?: string }> => {
  try {
    if (file.size > 8 * 1024 * 1024) {
      return { error: 'That photo is over 8MB — take it again at a lower size.' };
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const path = `${deliveryId}/${Date.now()}-${rand}.${ext}`;
    const { error } = await supabase.storage
      .from('delivery-receipts')
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (error) {
      return { error: /bucket/i.test(error.message)
        ? 'Receipt storage is not set up yet — run add_deliveries.sql.'
        : error.message };
    }
    const { data } = supabase.storage.from('delivery-receipts').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e: any) {
    return { error: e?.message || 'The upload failed.' };
  }
};

/* ── Customer (token only) ──────────────────────────────────────────────── */

export interface DeliveryStatusView {
  ok: boolean;
  error?: string;
  customerName?: string;
  item?: string;
  invoiceNumber?: string;
  dropLabel?: string;
  distanceKm?: number;
  deliveryFeeKES?: number;
  isBulky?: boolean;
  status?: DeliveryStatus;
  riderFirstName?: string;
  parcelService?: string;
  parcelFeeKES?: number;
  parcelRef?: string;
  parcelReceiptUrl?: string;
  collectedAt?: string;
  deliveredAt?: string;
  createdAt?: string;
}

export const fetchDeliveryStatus = async (token: string): Promise<DeliveryStatusView> => {
  try {
    const { data, error } = await supabase.rpc('delivery_status', { p_token: token });
    if (error) {
      console.error('delivery_status failed:', error.message);
      return { ok: false, error: friendly(error.message) };
    }
    return data as DeliveryStatusView;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not load that delivery.' };
  }
};

/* ── Customer asks for delivery themselves ──────────────────────────────── */

/**
 * The customer's own request, from the link sent to them after their order
 * lands. Creates the job, assigns whoever is on duty, and hands back their
 * tracking link.
 *
 * The fee is recomputed server-side and whatever the browser sends is ignored
 * — see request_delivery in add_deliveries.sql.
 */
export const requestDelivery = async (r: {
  customerName?: string;
  customerPhone?: string;
  item?: string;
  originId: string;
  lat: number;
  lng: number;
  label?: string;
  km: number;
  bulky?: boolean;
  reference?: string;
}): Promise<{ ok: boolean; error?: string; customerToken?: string; deliveryFeeKES?: number; assigned?: boolean }> => {
  try {
    const { data, error } = await supabase.rpc('request_delivery', {
      p_customer_name: r.customerName ?? null,
      p_customer_phone: r.customerPhone ?? null,
      p_item: r.item ?? null,
      p_origin_id: r.originId,
      p_lat: r.lat,
      p_lng: r.lng,
      p_label: r.label ?? null,
      p_km: r.km,
      p_bulky: r.bulky ?? false,
      p_reference: r.reference ?? null,
    });
    if (error) {
      console.error('request_delivery failed:', error.message);
      return { ok: false, error: friendly(error.message) };
    }
    if (!data?.ok) return { ok: false, error: data?.error || 'We could not book that.' };
    return {
      ok: true,
      customerToken: data.customerToken,
      deliveryFeeKES: data.deliveryFeeKES,
      assigned: data.assigned,
    };
  } catch (e: any) {
    return { ok: false, error: 'We could not book that. Please try again or message us.' };
  }
};
