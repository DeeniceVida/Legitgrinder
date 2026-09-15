import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck, Storefront, WarningCircle, Check, WhatsappLogo, ArrowSquareOut, CircleNotch,
} from '@phosphor-icons/react';
import {
  BookingSettings, DEFAULT_BOOKING_SETTINGS, formatDateLong, nairobiNow, parseSlotLines, SlotsByWeekday,
} from '../utils/bookings';
import {
  fetchBookingSettings, updateBookingSettings, fetchConsultationBookings, updateConsultationBooking,
  fetchPickupBookings, updatePickupBooking, ConsultationBooking, PickupBooking,
} from '../services/bookings';

/**
 * Admin → Bookings. Built before the shop exists, so everything here is
 * designed to be switched on later without a code change: the two switches,
 * the hub's name and location, the fee, the credit window and every slot.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const money = (n?: number) => (n == null ? '—' : `KES ${Math.round(n).toLocaleString('en-US')}`);

const waLink = (phone?: string) => {
  const d = String(phone || '').replace(/\D/g, '');
  const intl = d.startsWith('254') ? d : d.startsWith('0') ? '254' + d.slice(1) : d;
  return `https://wa.me/${intl}`;
};

const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors';
const lbl = 'text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5';

const statusChip: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-600',
  pending_payment: 'bg-neutral-100 text-gray-500',
  paid_conflict: 'bg-amber-50 text-[#FF9900]',
  cancelled: 'bg-rose-50 text-rose-500',
  completed: 'bg-teal-50 text-[#3D8593]',
  booked: 'bg-teal-50 text-[#3D8593]',
  collected: 'bg-emerald-50 text-emerald-600',
  missed: 'bg-rose-50 text-rose-500',
};

/** Seven textareas, one per weekday, one slot per line. Empty = closed that day. */
const SlotEditor: React.FC<{ value: SlotsByWeekday; onChange: (v: SlotsByWeekday) => void }> = ({ value, onChange }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {WEEKDAYS.map((name, i) => (
      <div key={name}>
        <label className={lbl}>{name}</label>
        <textarea
          rows={3}
          value={(value[String(i)] || []).join('\n')}
          onChange={e => {
            const lines = parseSlotLines(e.target.value);
            const next = { ...value };
            if (lines.length) next[String(i)] = lines; else delete next[String(i)];
            onChange(next);
          }}
          placeholder="closed"
          className={`${input} resize-none text-[12px] leading-relaxed ${(value[String(i)] || []).length ? '' : 'text-gray-300'}`}
        />
      </div>
    ))}
  </div>
);

const BookingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([]);
  const [pickups, setPickups] = useState<PickupBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [creditInvoice, setCreditInvoice] = useState('');

  const load = async () => {
    setLoading(true);
    const [s, c, p] = await Promise.all([fetchBookingSettings(), fetchConsultationBookings(), fetchPickupBookings()]);
    setSettings(s); setConsultations(c); setPickups(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (next: BookingSettings, what = 'details') => {
    setSaving(what); setError(null);
    const res = await updateBookingSettings(next);
    setSaving(null);
    if (!res.success) {
      setError(/schema cache|does not exist|relation/i.test(res.error || '')
        ? 'Run add_bookings.sql in Supabase first — the bookings tables do not exist yet.'
        : res.error || 'Could not save.');
      return false;
    }
    setSettings(next);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    return true;
  };

  /** A switch is a public change to the website. Say so before flipping it on. */
  const flip = async (key: 'consultationsEnabled' | 'pickupsEnabled') => {
    const turningOn = !settings[key];
    const what = key === 'consultationsEnabled' ? 'Paid in-person consultations' : 'Hub pickups at checkout';
    if (turningOn) {
      const gaps: string[] = [];
      if (!settings.hubAddress.trim()) gaps.push('the hub has no address yet');
      if (!settings.hubMapUrl.trim()) gaps.push('there is no map link');
      const warning = gaps.length ? `\n\nNote: ${gaps.join(' and ')}.` : '';
      if (!window.confirm(`Turn ON "${what}"?\n\nThis goes live on the website for every customer immediately.${warning}`)) return;
    }
    await save({ ...settings, [key]: turningOn }, key);
  };

  const today = nairobiNow().date;
  const upcoming = useMemo(() => consultations.filter(c => c.slotDate >= today && c.status !== 'cancelled'), [consultations, today]);
  const past = useMemo(() => consultations.filter(c => c.slotDate < today || c.status === 'cancelled'), [consultations, today]);
  const upcomingPickups = useMemo(() => pickups.filter(p => p.slotDate >= today && p.status !== 'cancelled'), [pickups, today]);

  const setConsultationStatus = async (c: ConsultationBooking, status: string) => {
    if (status === 'cancelled' && !window.confirm(`Cancel ${c.clientName}'s meeting? This frees the slot. It does not refund them.`)) return;
    setSaving(c.id);
    const res = await updateConsultationBooking(c.id, { status });
    setSaving(null);
    if (!res.success) { setError(res.error || 'Could not update.'); return; }
    load();
  };

  const markCredited = async (c: ConsultationBooking) => {
    setSaving(c.id);
    const res = await updateConsultationBooking(c.id, { creditedInvoice: creditInvoice.trim() || null });
    setSaving(null);
    if (!res.success) { setError(res.error || 'Could not save.'); return; }
    setCreditFor(null); setCreditInvoice(''); load();
  };

  const setPickupStatus = async (p: PickupBooking, status: 'collected' | 'missed' | 'booked') => {
    setSaving(p.id);
    const res = await updatePickupBooking(p.id, status);
    setSaving(null);
    if (!res.success) { setError(res.error || 'Could not update.'); return; }
    load();
  };

  if (loading) {
    return <p className="text-sm text-gray-400 font-medium flex items-center gap-2"><CircleNotch size={16} className="animate-spin" /> Loading bookings…</p>;
  }

  const Switch: React.FC<{ on: boolean; onClick: () => void; busy: boolean; title: string; note: string; icon: React.ReactNode; previewHref: string }> =
    ({ on, onClick, busy, title, note, icon, previewHref }) => (
      <div className={`rounded-2xl border p-5 flex items-start gap-4 ${on ? 'border-emerald-200 bg-emerald-50/40' : 'border-neutral-200 bg-white'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-gray-400'}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900">{title}</p>
          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{note}</p>
          <a href={previewHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#3D8593] mt-2 hover:underline">
            Preview <ArrowSquareOut size={11} weight="bold" />
          </a>
        </div>
        <button onClick={onClick} disabled={busy} aria-pressed={on}
          className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${on
            ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-neutral-200 text-gray-600 hover:bg-neutral-300'}`}>
          {busy ? '…' : on ? 'Live' : 'Off'}
        </button>
      </div>
    );

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
          <WarningCircle size={16} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-rose-900">{error}</p>
        </div>
      )}

      {/* ── The two switches ───────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Switch
          on={settings.consultationsEnabled} busy={saving === 'consultationsEnabled'}
          onClick={() => flip('consultationsEnabled')}
          icon={<CalendarCheck size={20} weight="duotone" />}
          title="Paid in-person consultations"
          note={settings.consultationsEnabled
            ? `Live. /consultation takes ${money(settings.consultationFeeKes)} bookings.`
            : 'Off. /consultation shows the old request form. Admins can still test-book from the preview.'}
          previewHref="/consultation?preview=bookings"
        />
        <Switch
          on={settings.pickupsEnabled} busy={saving === 'pickupsEnabled'}
          onClick={() => flip('pickupsEnabled')}
          icon={<Storefront size={20} weight="duotone" />}
          title="Hub pickups at checkout"
          note={settings.pickupsEnabled
            ? 'Live. In-stock items offer collection slots before payment.'
            : 'Off. Checkout is unchanged. Preview adds ?preview=bookings to the shop.'}
          previewHref="/shop?preview=bookings"
        />
      </div>

      {/* ── The hub and the rules ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-5">
        <p className="text-sm font-black text-gray-900">The hub</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Name</label>
            <input className={input} value={settings.hubName} onChange={e => setSettings({ ...settings, hubName: e.target.value })} />
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input className={input} value={settings.hubAddress} placeholder="Not set yet"
              onChange={e => setSettings({ ...settings, hubAddress: e.target.value })} />
          </div>
          <div>
            <label className={lbl}>Google Maps link</label>
            <input className={input} value={settings.hubMapUrl} placeholder="https://maps.app.goo.gl/…"
              onChange={e => setSettings({ ...settings, hubMapUrl: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className={lbl}>Consultation fee (KES)</label>
            <input type="number" className={input} value={settings.consultationFeeKes}
              onChange={e => setSettings({ ...settings, consultationFeeKes: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className={lbl}>Credit valid (days)</label>
            <input type="number" className={input} value={settings.consultationCreditDays}
              onChange={e => setSettings({ ...settings, consultationCreditDays: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className={lbl}>Cut-off hour (day before)</label>
            <input type="number" min={0} max={23} className={input} value={settings.cutoffHour}
              onChange={e => setSettings({ ...settings, cutoffHour: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className={lbl}>Meetings bookable (days)</label>
            <input type="number" className={input} value={settings.consultationDaysAhead}
              onChange={e => setSettings({ ...settings, consultationDaysAhead: Number(e.target.value) || 1 })} />
          </div>
          <div>
            <label className={lbl}>Pickups bookable (days)</label>
            <input type="number" className={input} value={settings.pickupDaysAhead}
              onChange={e => setSettings({ ...settings, pickupDaysAhead: Number(e.target.value) || 1 })} />
          </div>
        </div>

        <div>
          <p className="text-[12px] font-black text-gray-700 mb-2">Consultation slots <span className="font-medium text-gray-400">— one per line, blank day = closed</span></p>
          <SlotEditor value={settings.consultationSlots} onChange={v => setSettings({ ...settings, consultationSlots: v })} />
        </div>
        <div>
          <p className="text-[12px] font-black text-gray-700 mb-2">Pickup slots</p>
          <SlotEditor value={settings.pickupSlots} onChange={v => setSettings({ ...settings, pickupSlots: v })} />
        </div>

        <p className="text-[11px] text-gray-400">
          Renaming a slot does not move existing bookings — they keep the time they were booked for.
        </p>

        <button onClick={() => save(settings)} disabled={saving === 'details'}
          className="px-6 py-3 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving === 'details' ? 'Saving…' : saved ? <><Check size={13} weight="bold" /> Saved</> : 'Save hub & rules'}
        </button>
      </div>

      {/* ── Consultations ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-black text-gray-900">Upcoming consultations <span className="text-gray-400 font-bold">· {upcoming.length}</span></p>
        {!upcoming.length && <p className="text-sm text-gray-400">None booked.</p>}
        {upcoming.map(c => (
          <div key={c.id} className="p-4 rounded-2xl border border-neutral-100 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-sm font-black text-gray-900 flex items-center gap-2 flex-wrap">
                  {c.clientName}
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${statusChip[c.status] || ''}`}>
                    {c.status === 'pending_payment' ? 'not paid' : c.status === 'paid_conflict' ? 'paid · slot clash' : c.status}
                  </span>
                </p>
                <p className="text-[12px] font-bold text-[#3D8593] mt-1">{formatDateLong(c.slotDate)} · {c.slotLabel}</p>
                <p className="text-[12px] text-gray-600 mt-1.5 leading-relaxed">
                  <strong>{c.products}</strong> · {c.quantity} · budget {c.budget}
                </p>
                <p className="text-[10.5px] font-bold text-gray-400 mt-1">
                  {c.reference} · {money(c.paidKes)} paid
                  {c.creditExpires && ` · credit until ${formatDateLong(c.creditExpires)}`}
                  {c.creditedInvoice && ` · credited to ${c.creditedInvoice}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={waLink(c.clientPhone)} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#1eb955] text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <WhatsappLogo size={12} weight="fill" /> {c.clientPhone}
                </a>
                {(c.status === 'confirmed' || c.status === 'completed') && !c.creditedInvoice && (
                  <button onClick={() => { setCreditFor(c.id); setCreditInvoice(''); }}
                    className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:border-[#3D8593] hover:text-[#3D8593]">
                    Mark credited
                  </button>
                )}
                {c.status !== 'cancelled' && (
                  <button onClick={() => setConsultationStatus(c, 'cancelled')} disabled={saving === c.id}
                    className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-400 text-[9px] font-black uppercase tracking-widest hover:border-rose-300 hover:text-rose-500">
                    Cancel
                  </button>
                )}
              </div>
            </div>
            {creditFor === c.id && (
              <div className="mt-3 flex gap-2">
                <input className={input} placeholder="Invoice number the credit went to, e.g. LG100022"
                  value={creditInvoice} onChange={e => setCreditInvoice(e.target.value)} />
                <button onClick={() => markCredited(c)} disabled={saving === c.id || !creditInvoice.trim()}
                  className="px-4 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Save</button>
              </div>
            )}
          </div>
        ))}
        {past.length > 0 && (
          <p className="text-[11px] text-gray-400">{past.length} past or cancelled consultation{past.length === 1 ? '' : 's'} not shown.</p>
        )}
      </div>

      {/* ── Pickups ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-black text-gray-900">Upcoming collections <span className="text-gray-400 font-bold">· {upcomingPickups.length}</span></p>
        {!upcomingPickups.length && <p className="text-sm text-gray-400">None booked.</p>}
        {upcomingPickups.map(p => (
          <div key={p.id} className="p-4 rounded-2xl border border-neutral-100 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 flex items-center gap-2 flex-wrap">
                {p.clientName || 'Customer'}
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${statusChip[p.status] || ''}`}>{p.status}</span>
              </p>
              <p className="text-[12px] font-bold text-[#3D8593] mt-0.5">{formatDateLong(p.slotDate)} · {p.slotLabel}</p>
              <p className="text-[10.5px] font-bold text-gray-400 mt-0.5">{p.invoiceNumber}{p.item ? ` · ${p.item}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.clientPhone && (
                <a href={waLink(p.clientPhone)} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#1eb955] text-[9px] font-black uppercase tracking-widest">
                  <WhatsappLogo size={12} weight="fill" className="inline" />
                </a>
              )}
              {p.status === 'booked' ? (
                <>
                  <button onClick={() => setPickupStatus(p, 'collected')} disabled={saving === p.id}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest">Collected</button>
                  <button onClick={() => setPickupStatus(p, 'missed')} disabled={saving === p.id}
                    className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-400 text-[9px] font-black uppercase tracking-widest">Missed</button>
                </>
              ) : (
                <button onClick={() => setPickupStatus(p, 'booked')} disabled={saving === p.id}
                  className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-400 text-[9px] font-black uppercase tracking-widest">Undo</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingsPanel;
