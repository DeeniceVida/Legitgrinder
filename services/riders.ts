import { supabase } from '../lib/supabase';

/**
 * The riders who carry local deliveries. Admin-only — phone numbers are
 * personal data and nothing on the public site reads this table.
 */
export interface Rider {
  id: string;
  name: string;
  phone: string;
  isDefault: boolean;
  active: boolean;
  notes?: string;
  createdAt: string;
}

const toRider = (d: any): Rider => ({
  id: d.id,
  name: d.name,
  phone: d.phone,
  isDefault: d.is_default === true,
  active: d.active !== false,
  notes: d.notes || undefined,
  createdAt: d.created_at,
});

export const fetchRiders = async (): Promise<Rider[]> => {
  try {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');
    if (error || !data) return [];
    return data.map(toRider);
  } catch {
    return [];
  }
};

export const createRider = async (r: { name: string; phone: string; notes?: string }) => {
  const { error } = await supabase.from('riders').insert({
    name: r.name.trim(), phone: r.phone.trim(), notes: r.notes?.trim() || null,
  });
  return { success: !error, error: error?.message };
};

export const updateRider = async (id: string, patch: Partial<Rider>) => {
  const row: any = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.phone !== undefined) row.phone = patch.phone.trim();
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.notes !== undefined) row.notes = patch.notes || null;
  const { error } = await supabase.from('riders').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

/**
 * Make one rider the default. Clears the others first — the DB enforces a
 * single default, so setting one without clearing the old one would fail.
 */
export const setDefaultRider = async (id: string) => {
  const { error: clearErr } = await supabase
    .from('riders').update({ is_default: false }).eq('is_default', true);
  if (clearErr) return { success: false, error: clearErr.message };
  const { error } = await supabase.from('riders').update({ is_default: true }).eq('id', id);
  return { success: !error, error: error?.message };
};

export const deleteRider = async (id: string) => {
  const { error } = await supabase.from('riders').delete().eq('id', id);
  return { success: !error, error: error?.message };
};
