import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Package, CheckCircle, CircleNotch, WarningCircle, Receipt, MapPin, WhatsappLogo, Motorcycle,
  Copy, Check,
} from '@phosphor-icons/react';
import { DeliveryStatusView, fetchDeliveryStatus, reportDeliveryPayment } from '../services/deliveries';
import { etaLabel, sinceLabel, etaIsStale } from '../utils/delivery';
import { WHATSAPP_NUMBER } from '../constants';

/**
 * The customer's own link to one delivery — /delivery/<token>.
 *
 * Replaces a WhatsApp chain: the rider photographs the courier receipt, sends
 * it to the owner, the owner forwards it on. Here it simply appears, with the
 * courier's fee beside it, so "what did the parcel cost?" is answered by
 * evidence rather than by a message.
 *
 * Shows the rider's first name. Their phone number appears only as the number
 * to pay the delivery fee to, and only while it is unpaid — the owner chose the
 * rider's own number for that.
 */

const money = (n?: number) => (n == null ? null : `KES ${n.toLocaleString()}`);

const STEPS = [
  { key: 'assigned', label: 'Rider assigned', blurb: 'On the way to collect it' },
  { key: 'collected', label: 'Picked up', blurb: 'Your item is with the rider' },
  { key: 'delivered', label: 'Delivered', blurb: 'Handed over' },
];

const DeliveryTracking: React.FC = () => {
  const { token = '' } = useParams();
  const [d, setD] = useState<DeliveryStatusView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryStatus(token).then(res => { setD(res); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="bg-brand-bg min-h-screen flex items-center justify-center">
        <CircleNotch size={30} className="text-[#3D8593] animate-spin" />
      </div>
    );
  }

  if (!d?.ok) {
    return (
      <div className="bg-brand-bg min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <WarningCircle size={40} weight="duotone" className="text-[#FF9900] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">We couldn't find that delivery</h1>
          <p className="text-gray-500 text-sm font-light">{d?.error || 'Check the link, or ask us to resend it.'}</p>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-7 py-3 rounded-full bg-[#25D366] text-white font-black uppercase text-[10px] tracking-widest">
            <WhatsappLogo size={15} weight="fill" /> Message us
          </a>
        </div>
      </div>
    );
  }

  const stepIdx = STEPS.findIndex(s => s.key === d.status);

  return (
    <div className="bg-brand-bg min-h-screen pt-32 pb-24 px-4">
      <div className="max-w-xl mx-auto">
        <p className="eyebrow text-[#3D8593] mb-3">Your delivery</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-2">
          {d.status === 'delivered' ? 'Delivered.' : 'On its way.'}
        </h1>
        <p className="text-gray-500 font-light mb-8">
          {d.item || 'Your order'}
          {d.invoiceNumber && <span className="text-gray-400"> · {d.invoiceNumber}</span>}
        </p>

        {/* What the rider last said. The single question this page exists to
            answer — "where is it?" — and until now it could only say which
            stage the job was at, not how far off the rider actually is. */}
        {d.status !== 'delivered' && etaLabel(d.riderEtaCode, d.riderEtaMinutes) && (
          <div className={`rounded-[1.75rem] border p-5 mb-5 flex items-start gap-3.5 ${
            etaIsStale(d.riderEtaAt)
              ? 'bg-gray-50 border-gray-100'
              : 'bg-[#3D8593]/[0.07] border-[#3D8593]/20'
          }`}>
            <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              etaIsStale(d.riderEtaAt) ? 'bg-gray-200 text-gray-500' : 'bg-[#3D8593] text-white'
            }`}>
              <Motorcycle size={19} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="font-bold tracking-tight text-[15px]">
                {etaLabel(d.riderEtaCode, d.riderEtaMinutes)}
              </p>
              <p className="text-[12px] text-gray-500 font-light mt-0.5">
                {d.riderFirstName || 'The rider'} said this {sinceLabel(d.riderEtaAt)}
                {etaIsStale(d.riderEtaAt) && ' — it may be out of date'}
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="bg-white rounded-[1.75rem] border border-gray-100 p-6 mb-5">
          {STEPS.map((s, i) => {
            const doneStep = i <= stepIdx;
            return (
              <div key={s.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    doneStep ? 'bg-[#3D8593] text-white' : 'bg-neutral-100 text-gray-300'}`}>
                    {doneStep ? <CheckCircle size={16} weight="fill" /> : <Package size={14} weight="duotone" />}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className={`w-0.5 flex-1 my-1 ${i < stepIdx ? 'bg-[#3D8593]' : 'bg-neutral-100'}`} />
                  )}
                </div>
                <div className={`pb-6 ${i === STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <p className={`text-sm font-bold ${doneStep ? 'text-gray-900' : 'text-gray-300'}`}>{s.label}</p>
                  <p className="text-[12px] text-gray-400 font-light">{s.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* The money */}
        <div className="bg-white rounded-[1.75rem] border border-gray-100 p-6 mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">What it costs</p>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-gray-500">
                Rider {d.dropLabel ? <span className="text-gray-400">· {d.dropLabel}</span> : null}
                {d.distanceKm != null && <span className="text-gray-400"> · ~{d.distanceKm} km</span>}
              </span>
              <span className="text-[15px] font-black text-gray-900">{money(d.deliveryFeeKES) || '—'}</span>
            </div>
            {d.isBulky && (
              <p className="text-[11px] text-gray-400 font-light">Includes the bulky-item rate.</p>
            )}
            {(d.parcelFeeKES != null || d.parcelService) && (
              <div className="flex justify-between items-baseline pt-3 border-t border-neutral-100">
                <span className="text-[13px] text-gray-500">
                  Courier{(d.courierName || d.parcelService) ? ` · ${d.courierName || d.parcelService}` : ''}
                  <span className="block text-[11px] text-gray-400">Paid by you at their counter — receipt below</span>
                </span>
                <span className="text-[15px] font-black text-gray-900">{money(d.parcelFeeKES) || 'Pending'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Paying the rider. Absent until add_delivery_payment.sql has run. */}
        {d.paymentStatus && d.deliveryFeeKES != null && (
          <PayRider d={d} token={token} onReported={() => fetchDeliveryStatus(token).then(setD)} />
        )}

        {/* The receipt — the whole point */}
        {d.parcelReceiptUrl ? (
          <div className="bg-white rounded-[1.75rem] border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-50 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt size={17} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-black text-gray-900">Courier receipt</p>
                {d.parcelRef && <p className="text-[11px] font-bold text-gray-400">Ref {d.parcelRef}</p>}
              </div>
            </div>
            <a href={d.parcelReceiptUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img src={d.parcelReceiptUrl} alt="Courier receipt"
                className="w-full max-h-[520px] object-contain bg-neutral-50" />
            </a>
          </div>
        ) : d.status === 'delivered' ? null : (
          <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-[1.75rem] p-5">
            <MapPin size={18} weight="duotone" className="text-gray-300 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-gray-400 font-light leading-relaxed">
              {d.deliveryType === 'parcel'
                ? <>You pay {d.courierName || 'the courier'} directly at their counter — whatever they
                  charge. {d.riderFirstName || 'The rider'} photographs the receipt and it appears here.</>
                : <>{d.riderFirstName || 'The rider'} will bring it to the pin you dropped.</>}
            </p>
          </div>
        )}

        <div className="text-center mt-8">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#3D8593] font-bold text-sm hover:underline">
            <WhatsappLogo size={16} weight="fill" /> Something wrong? Message us
          </a>
        </div>
      </div>
    </div>
  );
};

/* ── Paying the rider ────────────────────────────────────────────────────── */

/**
 * Cash at the door, or M-Pesa to the rider's own number — then paste the
 * confirmation here. A parcel customer is never at the counter, so for them
 * M-Pesa is the only way; the paste is what lets the rider match it up.
 *
 * Pasting does not make it paid. The site cannot see the rider's M-Pesa, so
 * it waits for the rider to check and confirm.
 */
const PayRider: React.FC<{ d: DeliveryStatusView; token: string; onReported: () => void }> = ({ d, token, onReported }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const rider = d.riderFirstName || 'the rider';

  const copy = async () => {
    if (!d.riderPayPhone) return;
    try {
      await navigator.clipboard.writeText(d.riderPayPhone.replace(/\s+/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the number is on screen to type in */ }
  };

  const send = async () => {
    setSending(true);
    setError(null);
    const res = await reportDeliveryPayment(token, message);
    setSending(false);
    if (!res.ok) { setError(res.error || 'Could not send that.'); return; }
    setMessage('');
    setEditing(false);
    onReported();
  };

  if (d.paymentStatus === 'paid') {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-[1.75rem] p-5 mb-5">
        <CheckCircle size={22} weight="fill" className="text-emerald-600 shrink-0" />
        <p className="text-[13px] text-emerald-900 font-medium">
          Delivery fee paid{d.paymentMethod === 'cash' ? ' in cash' : ' by M-Pesa'} — {rider} confirmed it. Thank you.
        </p>
      </div>
    );
  }

  const reported = d.paymentStatus === 'reported' && !editing;

  return (
    <div className="bg-white rounded-[1.75rem] border border-gray-100 p-6 mb-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Pay the rider</p>
      <p className="text-[15px] font-bold text-gray-900 tracking-tight">
        Pay {rider} {money(d.deliveryFeeKES)}
      </p>
      <p className="text-[12.5px] text-gray-500 font-light mt-1 leading-relaxed">
        {d.deliveryType === 'parcel'
          ? <>Send it by M-Pesa, then paste the confirmation message below.</>
          : <>Cash when {rider} hands it over, or M-Pesa — if you use M-Pesa, paste the confirmation message below.</>}
      </p>

      {d.riderPayPhone ? (
        <div className="mt-4 flex items-center justify-between gap-3 bg-neutral-50 border border-neutral-100 rounded-2xl px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">M-Pesa · Send money</p>
            <p className="text-lg font-black text-gray-900 tracking-tight">{d.riderPayPhone}</p>
          </div>
          <button onClick={copy}
            className="shrink-0 px-4 py-2.5 rounded-full bg-[#3D8593] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            {copied ? <><Check size={13} weight="bold" /> Copied</> : <><Copy size={13} weight="bold" /> Copy</>}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[12px] text-gray-400 font-light">
          The number to pay appears here once a rider has the job.
        </p>
      )}

      {reported ? (
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-[13px] font-bold text-amber-900 flex items-center gap-2">
            <CircleNotch size={14} className="animate-spin" /> Waiting for {rider} to confirm
          </p>
          {d.paymentMessage && (
            <p className="text-[11.5px] text-amber-800/80 font-light mt-2 whitespace-pre-wrap break-words">{d.paymentMessage}</p>
          )}
          <button onClick={() => { setEditing(true); setMessage(d.paymentMessage || ''); }}
            className="text-[11px] font-bold text-amber-900 underline mt-2">
            Pasted the wrong message?
          </button>
        </div>
      ) : d.riderPayPhone && (
        <div className="mt-4">
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setError(null); }}
            rows={3}
            placeholder="Paste your M-Pesa message, e.g. “SJK4XXXX Confirmed. Ksh350.00 sent to …”"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-[13px] outline-none focus:border-[#3D8593] placeholder:text-gray-300"
          />
          {error && <p className="text-[12px] font-bold text-rose-500 mt-2">{error}</p>}
          <button onClick={send} disabled={sending || message.trim().length < 10}
            className="w-full h-12 mt-2 rounded-full bg-[#0f1a1c] text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-40">
            {sending ? 'Sending…' : "I've paid"}
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryTracking;
