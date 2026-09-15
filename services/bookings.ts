import { supabase } from '../lib/supabase';
import { BookingSettings, DEFAULT_BOOKING_SETTINGS, SlotsByWeekday } from '../utils/bookings';

/**
 * Hub pickups and paid consultations — see add_bookings.sql.
 *
 * Public calls go through SECURITY DEFINER functions that re-check every rule
 * (switch on, time really opened, cut-off not passed, slot free). The browser's
 * view of availability is a convenience; the database is the one that decides.
 */

const asSlots = (v: any, fallback: SlotsByWeekday): SlotsByWeekday => {
  if (!v || typeof v !== 'object') return fallback;
  const out: SlotsByWeekday = {};
  for (const [k, list] of Object.entries(v)) {
    if (Array.isArray(list)) out[k] = list.filter((x): x is string => typeof x === 'string');
  }
  return out;
};

const D = DEFAULT_BOOKING_SETTINGS;

const toSettings = (d: any): BookingSettings => ({
  consultationsEnabled: d.consultations_enabled === true,
  pickupsEnabled: d.pickups_enabled === true,
  hubName: d.hub_name || D.hubName,
  hubAddress: d.hub_address || '',
  hubMapUrl: d.hub_map_url || '',
  consultationFeeKes: Number(d.consultation_fee_kes ?? D.consultationFeeKes),
  consultationCreditDays: Number(d.consultation_credit_days ?? D.consultationCreditDays),
  meetingMinutes: Number(d.meeting_minutes ?? D.meetingMinutes),
  breakMinutes: Number(d.break_minutes ?? D.breakMinutes),
  dayStart: d.day_start || D.dayStart,
  dayEnd: d.day_end || D.dayEnd,
  pickupSlots: asSlots(d.pickup_slots, D.pickupSlots),
  cutoffHour: Number(d.cutoff_hour ?? D.cutoffHour),
  pickupDaysAhead: Number(d.pickup_days_ahead ?? D.pickupDaysAhead),
});

/**
 * Never throws. Before add_bookings.sql has run, and on any network failure,
 * this returns the defaults — both switches OFF — so the site simply carries on
 * as it did before the feature existed.
 */
export const fetchBookingSettings = async (): Promise<BookingSettings> => {
  try {
    const { data, error } = await supabase.from('booking_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !data) return D;
    return toSettings(data);
  } catch {
    return D;
  }
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateBookingSettings = async (s: BookingSettings): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.from('booking_settings').update({
    consultations_enabled: s.consultationsEnabled,
    pickups_enabled: s.pickupsEnabled,
    hub_name: s.hubName.trim() || D.hubName,
    hub_address: s.hubAddress.trim(),
    hub_map_url: s.hubMapUrl.trim(),
    consultation_fee_kes: Math.max(0, Math.round(s.consultationFeeKes)),
    consultation_credit_days: Math.max(0, Math.round(s.consultationCreditDays)),
    meeting_minutes: Math.max(15, Math.round(s.meetingMinutes)),
    break_minutes: Math.max(0, Math.round(s.breakMinutes)),
    day_start: HHMM.test(s.dayStart) ? s.dayStart : D.dayStart,
    day_end: HHMM.test(s.dayEnd) ? s.dayEnd : D.dayEnd,
    pickup_slots: s.pickupSlots,
    cutoff_hour: Math.min(23, Math.max(0, Math.round(s.cutoffHour))),
    pickup_days_ahead: Math.max(1, Math.round(s.pickupDaysAhead)),
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  return { success: !error, error: error?.message };
};

/* ── Consultations: what a client sees ─────────────────────────────────── */

/**
 * Days the founder has opened, each with its FREE slot keys ("10:00-11:30").
 * Taken, held-for-payment and past-cut-off times are already removed by the
 * database, so this is the same live calendar the admin sees, filtered.
 */
export const fetchOpenConsultationDays = async (from: string, to: string): Promise<Map<string, string[]>> => {
  const out = new Map<string, string[]>();
  try {
    const { data, error } = await supabase.rpc('consultation_open_days', { p_from: from, p_to: to });
    if (error || !Array.isArray(data)) return out;
    for (const r of data as { open_day: string; open_slot: string }[]) {
      if (!out.has(r.open_day)) out.set(r.open_day, []);
      out.get(r.open_day)!.push(r.open_slot);
    }
  } catch { /* an empty calendar, not a broken page */ }
  return out;
};

export interface ConsultationRequest {
  name: string;
  phone: string;
  email: string;
  products: string;
  quantity: string;
  budget: string;
  date: string;
  /** Slot key, "10:00-11:30". */
  slot: string;
}

export const createConsultationBooking = async (r: ConsultationRequest): Promise<{
  ok: boolean; reference?: string; amountKes?: number; taken?: boolean; error?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('create_consultation_booking', {
      p_name: r.name, p_phone: r.phone, p_email: r.email,
      p_products: r.products, p_quantity: r.quantity, p_budget: r.budget,
      p_date: r.date, p_slot: r.slot,
    });
    if (error) {
      console.error('create_consultation_booking failed:', error.message);
      return { ok: false, error: /schema cache|does not exist/i.test(error.message)
        ? 'Bookings are not set up yet.'
        : 'We could not start your booking. Please try again.' };
    }
    return data?.ok
      ? { ok: true, reference: data.reference, amountKes: data.amountKes }
      : { ok: false, taken: !!data?.taken, error: data?.error || 'We could not start your booking.' };
  } catch {
    return { ok: false, error: 'We could not start your booking. Please check your connection.' };
  }
};

export interface ConfirmedConsultation {
  status: 'confirmed' | 'paid_conflict' | 'completed';
  reference: string;
  clientName: string;
  slotDate: string;
  slotLabel: string;
  amountKes: number;
  paidKes: number;
  creditExpires?: string;
  creditDays: number;
  hubName: string;
  hubAddress: string;
  hubMapUrl: string;
}

/**
 * Ask OUR server to check the payment with Paystack and lock the slot.
 * Never trusts the Paystack popup's own success callback.
 */
export const confirmConsultation = async (reference: string): Promise<{
  ok: boolean; booking?: ConfirmedConsultation; notConfigured?: boolean; error?: string;
}> => {
  try {
    const res = await fetch('/api/confirm-consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { /* keep text for the error */ }
    if (json?.ok) return { ok: true, booking: json.booking };
    return {
      ok: false,
      notConfigured: !!json?.notConfigured,
      error: json?.error || `Could not confirm the payment (${res.status}).`,
    };
  } catch {
    return { ok: false, error: 'Could not reach the server to confirm your payment.' };
  }
};

export const bookPickup = async (r: {
  invoiceNumber: string; name?: string; phone?: string; email?: string; item?: string;
  date: string; slot: string;
}): Promise<{ ok: boolean; closed?: boolean; error?: string; hubName?: string; hubAddress?: string; hubMapUrl?: string }> => {
  try {
    const { data, error } = await supabase.rpc('book_pickup', {
      p_invoice_number: r.invoiceNumber, p_name: r.name ?? null, p_phone: r.phone ?? null,
      p_email: r.email ?? null, p_item: r.item ?? null, p_date: r.date, p_slot: r.slot,
    });
    if (error) {
      console.error('book_pickup failed:', error.message);
      return { ok: false, error: 'We could not save your collection slot.' };
    }
    return data?.ok
      ? { ok: true, hubName: data.hubName, hubAddress: data.hubAddress, hubMapUrl: data.hubMapUrl }
      : { ok: false, closed: !!data?.closed, error: data?.error || 'We could not save your collection slot.' };
  } catch {
    return { ok: false, error: 'We could not save your collection slot.' };
  }
};

/* ── Admin: the founder's calendar ─────────────────────────────────────── */

export interface ConsultationDay {
  day: string;
  slots: string[];
  note?: string;
}

/** Every day he has opened in a date range. A day with no row is closed. */
export const fetchConsultationDays = async (from: string, to: string): Promise<Map<string, ConsultationDay>> => {
  const out = new Map<string, ConsultationDay>();
  try {
    const { data, error } = await supabase.from('consultation_days').select('*')
      .gte('day', from).lte('day', to).order('day');
    if (error || !data) return out;
    for (const r of data as any[]) {
      out.set(r.day, { day: r.day, slots: Array.isArray(r.slots) ? r.slots : [], note: r.note ?? undefined });
    }
  } catch { /* shown as all closed */ }
  return out;
};

/** The database trigger's own words, minus Postgres's framing. */
const cleanDbError = (msg?: string) => {
  if (!msg) return 'Could not save that day.';
  if (/schema cache|does not exist|relation/i.test(msg)) return 'Run add_bookings.sql in Supabase first — the calendar table does not exist yet.';
  return msg.replace(/^.*?ERROR:\s*/i, '');
};

/** Open a day, or change its times. Rejected by the database if it would drop a paid meeting. */
export const saveConsultationDay = async (day: string, slots: string[], note?: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.from('consultation_days')
    .upsert({ day, slots, note: note?.trim() || null }, { onConflict: 'day' });
  return { success: !error, error: error ? cleanDbError(error.message) : undefined };
};

/** Close a day. Rejected by the database if anyone has paid for a meeting on it. */
export const closeConsultationDay = async (day: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.from('consultation_days').delete().eq('day', day);
  return { success: !error, error: error ? cleanDbError(error.message) : undefined };
};

/* ── Admin: bookings ───────────────────────────────────────────────────── */

export interface ConsultationBooking {
  id: string;
  reference: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  products: string;
  quantity: string;
  budget: string;
  slotDate: string;
  slotLabel: string;
  amountKes: number;
  status: string;
  paidKes?: number;
  paidAt?: string;
  creditExpires?: string;
  creditedInvoice?: string;
  notes?: string;
  createdAt: string;
}

export const fetchConsultationBookings = async (): Promise<ConsultationBooking[]> => {
  try {
    const { data, error } = await supabase.from('consultation_bookings').select('*')
      .order('slot_date', { ascending: true }).order('slot_label').limit(500);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id, reference: d.reference, clientName: d.client_name, clientPhone: d.client_phone,
      clientEmail: d.client_email, products: d.products, quantity: d.quantity, budget: d.budget,
      slotDate: d.slot_date, slotLabel: d.slot_label, amountKes: Number(d.amount_kes),
      status: d.status, paidKes: d.paid_kes ?? undefined, paidAt: d.paid_at ?? undefined,
      creditExpires: d.credit_expires ?? undefined, creditedInvoice: d.credited_invoice ?? undefined,
      notes: d.notes ?? undefined, createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
};

export const updateConsultationBooking = async (id: string, patch: {
  status?: string; creditedInvoice?: string | null; notes?: string | null;
}) => {
  const row: any = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.creditedInvoice !== undefined) row.credited_invoice = patch.creditedInvoice || null;
  if (patch.notes !== undefined) row.notes = patch.notes || null;
  const { error } = await supabase.from('consultation_bookings').update(row).eq('id', id);
  return { success: !error, error: error?.message };
};

export interface PickupBooking {
  id: string;
  invoiceNumber: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  item?: string;
  slotDate: string;
  slotLabel: string;
  status: string;
  collectedAt?: string;
}

export const fetchPickupBookings = async (): Promise<PickupBooking[]> => {
  try {
    const { data, error } = await supabase.from('pickup_bookings').select('*')
      .order('slot_date', { ascending: true }).order('slot_label').limit(300);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id, invoiceNumber: d.invoice_number, clientName: d.client_name ?? undefined,
      clientPhone: d.client_phone ?? undefined, clientEmail: d.client_email ?? undefined,
      item: d.item ?? undefined, slotDate: d.slot_date, slotLabel: d.slot_label,
      status: d.status, collectedAt: d.collected_at ?? undefined,
    }));
  } catch {
    return [];
  }
};

export const updatePickupBooking = async (id: string, status: 'booked' | 'collected' | 'missed' | 'cancelled') => {
  const { error } = await supabase.from('pickup_bookings').update({
    status,
    collected_at: status === 'collected' ? new Date().toISOString() : null,
  }).eq('id', id);
  return { success: !error, error: error?.message };
};
