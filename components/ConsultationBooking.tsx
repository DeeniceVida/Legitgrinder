import React, { useEffect, useMemo, useState } from 'react';
import { PaystackButton } from 'react-paystack';
import {
  CalendarBlank, CheckCircle, CircleNotch, WarningCircle, WhatsappLogo, MapPin,
  ShieldCheck, Package, Coins, Hash, User, EnvelopeSimple, Phone,
} from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';
import {
  BookingSettings, openSlots, groupByDate, formatDateLong, nairobiNow, addDays, OpenSlot,
} from '../utils/bookings';
import {
  fetchTakenConsultationSlots, createConsultationBooking, confirmConsultation, ConfirmedConsultation,
} from '../services/bookings';

/**
 * Paid, in-person strategy meeting at the hub.
 *
 * Four questions, a slot, the terms stated plainly, then payment. The slot is
 * only ever confirmed by our server after it has checked with Paystack — see
 * functions/api/confirm-consultation.ts. Until then the customer holds the slot
 * for 20 minutes and nothing is promised.
 */

const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

const field = 'w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#3D8593] outline-none transition-colors';
const label = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5';

type Step = 'form' | 'pay' | 'confirming' | 'done' | 'problem';

const ConsultationBooking: React.FC<{ settings: BookingSettings; preview?: boolean }> = ({ settings, preview }) => {
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [products, setProducts] = useState('');
  const [quantity, setQuantity] = useState('');
  const [budget, setBudget] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [step, setStep] = useState<Step>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [amountKes, setAmountKes] = useState(settings.consultationFeeKes);
  const [booking, setBooking] = useState<ConfirmedConsultation | null>(null);

  const loadTaken = async () => {
    setLoadingSlots(true);
    const today = nairobiNow().date;
    setTaken(await fetchTakenConsultationSlots(addDays(today, 1), addDays(today, settings.consultationDaysAhead)));
    setLoadingSlots(false);
  };
  useEffect(() => { loadTaken(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => groupByDate(
    openSlots(settings.consultationSlots, settings.cutoffHour, settings.consultationDaysAhead, taken),
  ), [settings, taken]);

  const slotsForDay: OpenSlot[] = days.find(d => d.date === date)?.slots || [];
  const fee = settings.consultationFeeKes;

  const start = async () => {
    setError(null);
    if (!products.trim() || !quantity.trim() || !budget.trim()) { setError('Please answer the first three questions.'); return; }
    if (!date || !slot) { setError('Choose a date and a time.'); return; }
    if (!name.trim() || phone.replace(/\D/g, '').length < 9) { setError('We need your name and a phone number.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('We need an email for your booking pass.'); return; }
    if (!agreed) { setError('Please confirm you have read the fee and credit terms.'); return; }

    setBusy(true);
    const res = await createConsultationBooking({
      name: name.trim(), phone: phone.trim(), email: email.trim(),
      products: products.trim(), quantity: quantity.trim(), budget: budget.trim(),
      date, slot,
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.error || 'We could not start your booking.');
      if (res.taken) { setSlot(null); loadTaken(); }
      return;
    }
    setReference(res.reference!);
    setAmountKes(res.amountKes ?? fee);
    setStep('pay');
  };

  const onPaid = async () => {
    if (!reference) return;
    setStep('confirming');
    const res = await confirmConsultation(reference);
    if (res.ok && res.booking) {
      setBooking(res.booking);
      setStep('done');
    } else {
      setError(res.error || 'We could not confirm your booking automatically.');
      setStep('problem');
    }
  };

  const waMessage = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

  /* ── Confirmed ─────────────────────────────────────────────────────────── */
  if (step === 'done' && booking) {
    const clash = booking.status === 'paid_conflict';
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 p-8 md:p-10">
        <CheckCircle size={52} weight="duotone" className={clash ? 'text-[#FF9900] mb-5' : 'text-[#3D8593] mb-5'} />
        <h2 className="text-3xl font-bold tracking-tighter mb-2">
          {clash ? 'Payment received.' : <>You're <span className="heading-accent italic font-light text-[#3D8593]">booked.</span></>}
        </h2>
        <p className="text-gray-500 font-light leading-relaxed mb-6">
          {clash
            ? 'Someone confirmed that slot a moment before you. Your payment is safe — we will contact you today to set a new time.'
            : 'Your booking pass is on its way to your email.'}
        </p>

        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 mb-6">
          {[
            ['When', `${formatDateLong(booking.slotDate)} · ${booking.slotLabel}`],
            ['Where', [booking.hubName, booking.hubAddress].filter(Boolean).join(', ') || 'We will send the exact location before your meeting.'],
            ['Reference', booking.reference],
            ['Paid', money(booking.paidKes)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 pt-0.5">{k}</span>
              <span className="text-sm font-bold text-gray-900 text-right">{v}</span>
            </div>
          ))}
        </div>

        {!clash && (
          <p className="text-[13px] text-[#1d4d55] bg-teal-50 border border-teal-100 rounded-2xl p-4 leading-relaxed mb-6">
            <strong>Your {money(booking.amountKes)} comes off your order</strong> if you place it within {booking.creditDays} days
            of the meeting{booking.creditExpires ? ` — by ${formatDateLong(booking.creditExpires)}` : ''}.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {booking.hubMapUrl && (
            <a href={booking.hubMapUrl} target="_blank" rel="noopener noreferrer"
              className="h-12 rounded-full bg-[#0f1a1c] text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
              <MapPin size={15} weight="fill" /> Open location
            </a>
          )}
          <a href={waMessage(`Hi LegitGrinder, I've booked a consultation.\nReference: ${booking.reference}\n${formatDateLong(booking.slotDate)}, ${booking.slotLabel}`)}
            target="_blank" rel="noopener noreferrer"
            className={`h-12 rounded-full bg-[#25D366] text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ${booking.hubMapUrl ? '' : 'sm:col-span-2'}`}>
            <WhatsappLogo size={15} weight="fill" /> Message us
          </a>
        </div>
      </div>
    );
  }

  /* ── Paid, but we could not confirm it ────────────────────────────────── */
  if (step === 'problem') {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 p-8 md:p-10">
        <WarningCircle size={48} weight="duotone" className="text-[#FF9900] mb-5" />
        <h2 className="text-2xl font-bold tracking-tighter mb-3">We need to confirm this by hand.</h2>
        <p className="text-gray-500 font-light leading-relaxed mb-2">{error}</p>
        <p className="text-gray-500 font-light leading-relaxed mb-6">
          Your reference is <strong className="text-gray-900">{reference}</strong>. Send it to us and we will confirm your slot.
        </p>
        <a href={waMessage(`Hi LegitGrinder, I paid for a consultation but it didn't confirm.\nReference: ${reference}\n${date ? formatDateLong(date) : ''}, ${slot || ''}`)}
          target="_blank" rel="noopener noreferrer"
          className="h-12 rounded-full bg-[#25D366] text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
          <WhatsappLogo size={15} weight="fill" /> Send reference on WhatsApp
        </a>
      </div>
    );
  }

  /* ── The form ─────────────────────────────────────────────────────────── */
  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 p-7 md:p-10">
      {preview && (
        <p className="mb-6 text-[11px] font-bold text-[#8a4b00] bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          Preview — consultations are switched off. Only a signed-in admin can make a booking here.
        </p>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="cb-products" className={label}>1 · What are you looking to import?</label>
          <div className="relative">
            <Package size={17} className="absolute left-4 top-5 text-gray-300 pointer-events-none" />
            <textarea id="cb-products" rows={3} value={products} onChange={e => setProducts(e.target.value)}
              className={`${field} resize-none`} placeholder="Office chairs, gaming monitors, CNC parts…" disabled={step !== 'form'} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="cb-qty" className={label}>2 · Estimated quantity</label>
            <div className="relative">
              <Hash size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input id="cb-qty" value={quantity} onChange={e => setQuantity(e.target.value)}
                className={field} placeholder="About 50 units" disabled={step !== 'form'} />
            </div>
          </div>
          <div>
            <label htmlFor="cb-budget" className={label}>3 · Target budget</label>
            <div className="relative">
              <Coins size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input id="cb-budget" value={budget} onChange={e => setBudget(e.target.value)}
                className={field} placeholder="KES 500,000" disabled={step !== 'form'} />
            </div>
          </div>
        </div>

        <div>
          <p className={label}>4 · Choose a date and time</p>
          {loadingSlots ? (
            <p className="text-sm text-gray-400 flex items-center gap-2"><CircleNotch size={15} className="animate-spin" /> Checking availability…</p>
          ) : days.length === 0 ? (
            <p className="text-sm text-gray-500 bg-neutral-50 rounded-2xl p-4">
              Every meeting slot is taken for now. Message us on WhatsApp and we will fit you in.
            </p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {days.map(d => (
                  <button key={d.date} type="button" disabled={step !== 'form'}
                    onClick={() => { setDate(d.date); setSlot(null); setError(null); }}
                    className={`shrink-0 px-4 py-3 rounded-2xl border text-left transition-colors ${date === d.date
                      ? 'border-[#3D8593] bg-[#3D8593]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="flex items-center gap-1.5 text-[12px] font-black text-gray-900 whitespace-nowrap">
                      <CalendarBlank size={13} weight="bold" className="text-[#3D8593]" />
                      {formatDateLong(d.date).split(' ').slice(0, 2).join(' ')}
                    </span>
                    <span className="block text-[10px] font-bold text-gray-400 mt-0.5">{d.slots.length} open</span>
                  </button>
                ))}
              </div>
              {date && (
                <div className="grid sm:grid-cols-3 gap-2 mt-3">
                  {slotsForDay.map(s => (
                    <button key={s.label} type="button" disabled={step !== 'form'}
                      onClick={() => { setSlot(s.label); setError(null); }}
                      className={`px-3 py-3 rounded-xl border text-[12px] font-bold transition-colors ${slot === s.label
                        ? 'border-[#3D8593] bg-[#3D8593] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className={`${label} mt-4`}>Where to send your booking pass</p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="relative">
              <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input value={name} onChange={e => setName(e.target.value)} className={field} placeholder="Full name" disabled={step !== 'form'} />
            </div>
            <div className="relative">
              <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" className={field} placeholder="Phone" disabled={step !== 'form'} />
            </div>
            <div className="relative">
              <EnvelopeSimple size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" className={field} placeholder="Email" disabled={step !== 'form'} />
            </div>
          </div>
        </div>

        {/* The terms, stated before any money moves — not in small print after. */}
        <div className="rounded-2xl bg-[#0f1a1c] text-white p-5 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7fc2ce]">Before you pay</p>
          <p className="text-sm"><strong>In-person consultation fee: {money(fee)}</strong> <span className="text-neutral-400">(non-refundable)</span></p>
          <p className="text-sm text-neutral-300 leading-relaxed">
            <strong className="text-white">Credit policy:</strong> 100% of this fee ({money(fee)}) is credited directly toward your
            procurement order if you place it within {settings.consultationCreditDays} days of our meeting.
          </p>
          <label className="flex items-start gap-3 pt-2 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={step !== 'form'}
              className="mt-0.5 w-4 h-4 accent-[#FF9900]" />
            <span className="text-[12.5px] text-neutral-300">I understand the fee and how the credit works.</span>
          </label>
        </div>

        {error && step === 'form' && (
          <p className="text-sm font-bold text-rose-600 flex items-start gap-2"><WarningCircle size={17} weight="duotone" className="shrink-0 mt-0.5" /> {error}</p>
        )}

        {step === 'form' && (
          <button type="button" onClick={start} disabled={busy}
            className="btn-vibrant-orange shine w-full py-4 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
            {busy ? <><CircleNotch size={16} className="animate-spin" /> Holding your slot…</> : <>Continue to payment · {money(fee)}</>}
          </button>
        )}

        {step === 'pay' && reference && (
          <div className="space-y-3">
            <p className="text-[12px] text-gray-500 text-center">
              Your slot is held for 20 minutes while you pay. Reference <strong className="text-gray-900">{reference}</strong>.
            </p>
            <PaystackButton
              className="w-full h-[56px] bg-[#3D8593] text-white rounded-full font-black uppercase text-[11px] tracking-[0.2em] hover:bg-[#0f1a1c] transition-colors"
              publicKey={PAYSTACK_PUBLIC_KEY}
              amount={Math.round(amountKes * 100)}
              currency="KES"
              email={email.trim()}
              reference={reference}
              metadata={{
                custom_fields: [
                  { display_name: 'Booking', variable_name: 'booking', value: reference },
                  { display_name: 'Meeting', variable_name: 'meeting', value: `${date} ${slot}` },
                ],
              }}
              text={`Pay ${money(amountKes)}`}
              onSuccess={onPaid}
              onClose={() => { /* slot stays held for 20 minutes; they can press again */ }}
            />
            <button type="button" onClick={() => { setStep('form'); setReference(null); }}
              className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">
              Change my answers
            </button>
          </div>
        )}

        {step === 'confirming' && (
          <p className="text-sm font-bold text-[#3D8593] flex items-center justify-center gap-2 py-4">
            <CircleNotch size={17} className="animate-spin" /> Confirming your payment with Paystack…
          </p>
        )}

        <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <ShieldCheck size={14} weight="fill" className="text-emerald-500" /> Paid securely through Paystack
        </p>
      </div>
    </div>
  );
};

export default ConsultationBooking;
