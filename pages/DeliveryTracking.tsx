import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Package, CheckCircle, CircleNotch, WarningCircle, Receipt, MapPin, WhatsappLogo, Motorcycle,
} from '@phosphor-icons/react';
import { DeliveryStatusView, fetchDeliveryStatus } from '../services/deliveries';
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
 * Shows the rider's first name and no phone number. The customer needs to know
 * who is coming, not how to reach them directly.
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

export default DeliveryTracking;
