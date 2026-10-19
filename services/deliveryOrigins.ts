import { supabase } from '../lib/supabase';
import { Origin, DEFAULT_ORIGINS, setOrigins } from '../utils/delivery';

/**
 * Where a rider collects from — rows now, not a list in the code.
 *
 * The same rows price the booking server-side (request_delivery looks the id
 * up in this table), so a point the owner adds here works end to end with no
 * deploy, and one they retire stops being accepted.
 */

const toOrigin = (r: any): Origin => ({
  id: r.id,
  name: r.name,
  detail: r.detail || '',
  adminDetail: r.admin_detail || '',
  lat: Number(r.lat),
  lng: Number(r.lng),
});

/** Active points, in the owner's order. Falls back to the built-in list. */
export const fetchDeliveryOrigins = async (includeRetired = false): Promise<Origin[]> => {
  try {
    let q = supabase.from('delivery_origins')
      .select('id, name, detail, admin_detail, lat, lng, active, sort_order')
      .order('sort_order', { ascending: true });
    if (!includeRetired) q = q.eq('active', true);
    const { data, error } = await q;
    if (error || !data?.length) return DEFAULT_ORIGINS;
    return data.map(toOrigin);
  } catch {
    return DEFAULT_ORIGINS;
  }
};

/** Read them and hand them to the quote maths — what every page calls on mount. */
export const loadDeliveryOrigins = async (): Promise<Origin[]> => {
  const list = await fetchDeliveryOrigins();
  setOrigins(list);
  return list;
};

/** The admin list, retired ones included, so they can be switched back on. */
export interface AdminOrigin extends Origin {
  active: boolean;
  sortOrder: number;
}

export const fetchOriginsForAdmin = async (): Promise<AdminOrigin[]> => {
  const { data, error } = await supabase.from('delivery_origins')
    .select('id, name, detail, admin_detail, lat, lng, active, sort_order')
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data.map(r => ({ ...toOrigin(r), active: r.active !== false, sortOrder: r.sort_order ?? 100 }));
};

/** A slug from the place's own name, so the owner never has to invent one. */
export const slugFor = (name: string, taken: string[]): string => {
  const base = (name || 'point').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'point';
  let id = /^[a-z]/.test(base) ? base : `p${base}`;
  let n = 2;
  while (taken.includes(id)) id = `${/^[a-z]/.test(base) ? base : `p${base}`}${n++}`;
  return id;
};

const validate = (o: Partial<AdminOrigin>): string | null => {
  if (!o.name?.trim()) return 'Give the place a name — what a customer should see, like "Eastleigh".';
  if (!Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return 'Paste a Google Maps link or coordinates for the pin.';
  // Kenya, roughly — the same bounds request_delivery enforces.
  if (o.lat! < -5.5 || o.lat! > 5.5 || o.lng! < 33 || o.lng! > 42.5) return 'That pin is outside Kenya.';
  return null;
};

/** Every write is read back: an update that matches no row returns no error. */
export const createOrigin = async (
  o: { id: string; name: string; detail: string; adminDetail: string; lat: number; lng: number; sortOrder?: number },
): Promise<{ success: boolean; error?: string }> => {
  const bad = validate(o);
  if (bad) return { success: false, error: bad };
  if (!/^[a-z][a-z0-9_]{1,31}$/.test(o.id)) return { success: false, error: 'Could not make a short code for that name.' };

  const { data, error } = await supabase.from('delivery_origins').insert({
    id: o.id,
    name: o.name.trim(),
    detail: o.detail.trim(),
    admin_detail: o.adminDetail.trim(),
    lat: o.lat,
    lng: o.lng,
    sort_order: o.sortOrder ?? 100,
  }).select('id');

  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: 'Nothing was saved — sign in as admin and try again.' };
  return { success: true };
};

export const updateOrigin = async (
  id: string,
  patch: Partial<Pick<AdminOrigin, 'name' | 'detail' | 'adminDetail' | 'lat' | 'lng' | 'active' | 'sortOrder'>>,
): Promise<{ success: boolean; error?: string }> => {
  if (patch.name !== undefined || patch.lat !== undefined) {
    const bad = validate({ name: patch.name ?? 'x', lat: patch.lat ?? 0, lng: patch.lng ?? 36 });
    if (patch.name !== undefined && !patch.name.trim()) return { success: false, error: 'The name cannot be empty.' };
    if (patch.lat !== undefined && bad) return { success: false, error: bad };
  }
  const row: any = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.detail !== undefined) row.detail = patch.detail.trim();
  if (patch.adminDetail !== undefined) row.admin_detail = patch.adminDetail.trim();
  if (patch.lat !== undefined) row.lat = patch.lat;
  if (patch.lng !== undefined) row.lng = patch.lng;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;

  const { data, error } = await supabase.from('delivery_origins').update(row).eq('id', id).select('id');
  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: 'Nothing was saved — sign in as admin and try again.' };
  return { success: true };
};

/**
 * Turn a pasted Google Maps link (including the short app.goo.gl kind) or a
 * pair of coordinates into a pin, using the same endpoint the customer's own
 * form uses.
 */
export const resolvePin = async (raw: string): Promise<{ lat?: number; lng?: number; error?: string }> => {
  const text = raw.trim();
  if (!text) return { error: 'Paste a Google Maps link or coordinates.' };

  // The place pin (!3d/!4d) first: @lat,lng is only the map's viewport centre,
  // which sits a few hundred metres off and would bake that into every fee.
  for (const p of [
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&]q=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
  ]) {
    const m = text.match(p);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  if (!/^https?:\/\//i.test(text)) return { error: 'Paste the whole link, or coordinates like -1.2854, 36.8266.' };

  try {
    const res = await fetch('/api/resolve-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: text }),
    });
    const d = await res.json();
    if (d?.success) return { lat: d.lat, lng: d.lng };
    return { error: d?.error || 'Could not read a location from that link.' };
  } catch {
    return { error: 'Could not open that link.' };
  }
};
