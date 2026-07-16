import React, { useState } from 'react';
import {
  X, Truck, ArrowClockwise, WarningCircle, CheckCircle, ArrowRight,
  Boat, Package, MapPin, ChatCircleText, Stack, MagnifyingGlass, Copy, LinkSimple
} from '@phosphor-icons/react';
import { Invoice, Origin, InternalStatus, OrderStatus } from '../types';
import { MessageIntent } from '../services/messageAgent';
import { updateOrderLogistics } from '../services/supabaseData';
import {
  PIPELINE, internalLabel, internalToClientStatus, internalToProgress,
  internalToMessageIntent, orderInternalStatus, nextStatus, GRACE_DAYS, trackingLookupUrl
} from '../utils/logistics';

interface LogisticsPanelProps {
  invoice: Invoice | null;
  allInvoices: Invoice[];
  onClose: () => void;
  onUpdated: (updated: Invoice[]) => void;
  onDraftMessage: (invoice: Invoice, intent: MessageIntent) => void;
}

const inputBase =
  'w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#3D8593] outline-none transition-colors';
const labelBase = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2';

const LogisticsPanel: React.FC<LogisticsPanelProps> = ({
  invoice, allInvoices, onClose, onUpdated, onDraftMessage
}) => {
  const [origin, setOrigin] = useState<Origin>(invoice?.origin || 'China');
  const [inlandTracking, setInlandTracking] = useState(invoice?.inlandTracking || '');
  const [containerNumber, setContainerNumber] = useState(invoice?.containerNumber || '');
  const [estArrival, setEstArrival] = useState(invoice?.estArrival ? invoice.estArrival.slice(0, 10) : '');
  const [status, setStatus] = useState<InternalStatus>(invoice ? orderInternalStatus(invoice) : InternalStatus.ORDER_PLACED);
  const [mombasaArrivedAt, setMombasaArrivedAt] = useState<string | null>(invoice?.mombasaArrivedAt || null);
  const [cascade, setCascade] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!invoice) return null;

  const isChina = origin === 'China';
  const clientStatus = internalToClientStatus(status);
  const intentAtStatus = internalToMessageIntent(status);
  const next = nextStatus(status);

  // Other orders sharing this container (China cascade).
  const containerMates = containerNumber
    ? allInvoices.filter(i => i.id !== invoice.id && i.containerNumber === containerNumber)
    : [];

  const origin_ = typeof window !== 'undefined' ? window.location.origin : 'https://legitgrinder.com';
  const clientTrackingLink = `${origin_}/tracking?id=${invoice.invoiceNumber}`;
  const inlandLookup = trackingLookupUrl(inlandTracking);
  const containerLookup = trackingLookupUrl(containerNumber);

  const copyTrackingLink = () => {
    navigator.clipboard.writeText(clientTrackingLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    });
  };

  const chooseStatus = (s: InternalStatus) => {
    setStatus(s);
    // Starting the port clock: stamp arrival now if we don't have one yet.
    if (s === InternalStatus.ARRIVED_PORT && !mombasaArrivedAt) {
      setMombasaArrivedAt(new Date().toISOString());
    }
  };

  const buildFields = () => {
    const arrived = status === InternalStatus.ARRIVED_PORT
      ? (mombasaArrivedAt || new Date().toISOString())
      : mombasaArrivedAt;
    return {
      origin,
      inlandTracking: inlandTracking.trim(),
      containerNumber: isChina ? containerNumber.trim() : '',
      internalStatus: status,
      estArrival: estArrival || null,
      mombasaArrivedAt: arrived,
      status: clientStatus as unknown as string,
      progress: internalToProgress(status)
    };
  };

  const applyLocally = (inv: Invoice, f: ReturnType<typeof buildFields>): Invoice => ({
    ...inv,
    origin: f.origin,
    inlandTracking: f.inlandTracking || undefined,
    containerNumber: f.containerNumber || undefined,
    internalStatus: f.internalStatus,
    estArrival: f.estArrival || undefined,
    mombasaArrivedAt: f.mombasaArrivedAt || undefined,
    status: f.status as OrderStatus,
    progress: f.progress
  });

  const handleSave = async (): Promise<boolean> => {
    setError(null);
    setSaving(true);
    const fields = buildFields();
    const res = await updateOrderLogistics(invoice.id, fields);
    if (!res.success) {
      setSaving(false);
      setError(res.error?.message || 'Failed to save tracking.');
      return false;
    }

    const updated: Invoice[] = [applyLocally(invoice, fields)];

    // Cascade the shipping-leg state across the whole container (not client identity).
    if (isChina && cascade && containerMates.length) {
      for (const mate of containerMates) {
        const mateFields = {
          ...fields,
          // keep each mate's own inland tracking; share container-level state
          inlandTracking: mate.inlandTracking || fields.inlandTracking
        };
        const r = await updateOrderLogistics(mate.id, mateFields);
        if (r.success) updated.push(applyLocally(mate, mateFields));
      }
    }

    setSaving(false);
    onUpdated(updated);
    return true;
  };

  const handleSaveAndClose = async () => {
    if (await handleSave()) onClose();
  };

  const handleDraft = async (intent: MessageIntent) => {
    if (await handleSave()) onDraftMessage(invoice, intent);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-2xl my-8 bg-brand-bg rounded-[1.75rem] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="relative bg-[#0f1a1c] text-white px-7 py-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#3D8593]/20 rounded-full -mr-16 -mt-16 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#7fc2ce]">
                <Truck size={22} weight="duotone" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Tracking</h2>
                <p className="text-[11px] text-white/50 font-medium">{invoice.clientName} · {invoice.productName} · IG-{invoice.invoiceNumber}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-7 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3" role="alert">
              <WarningCircle size={20} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Origin */}
          <div>
            <span className={labelBase}>Where is it coming from?</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOrigin('China')}
                className={`px-4 py-3.5 rounded-2xl text-left border transition-all ${isChina ? 'border-[#3D8593] bg-teal-50' : 'border-gray-200 bg-white hover:border-[#3D8593]/40'}`}
              >
                <span className={`flex items-center gap-2 text-sm font-black ${isChina ? 'text-[#3D8593]' : 'text-gray-700'}`}><Boat size={16} weight="duotone" /> China</span>
                <span className="block text-[10px] text-gray-400 font-medium mt-0.5">Inland + sea container</span>
              </button>
              <button
                onClick={() => setOrigin('US-UK')}
                className={`px-4 py-3.5 rounded-2xl text-left border transition-all ${!isChina ? 'border-[#FF9900] bg-orange-50' : 'border-gray-200 bg-white hover:border-[#FF9900]/40'}`}
              >
                <span className={`flex items-center gap-2 text-sm font-black ${!isChina ? 'text-[#FF9900]' : 'text-gray-700'}`}><Package size={16} weight="duotone" /> US / UK</span>
                <span className="block text-[10px] text-gray-400 font-medium mt-0.5">Domestic + air estimate</span>
              </button>
            </div>
          </div>

          {/* Tracking inputs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lg-inland" className={labelBase}>{isChina ? 'Inland China tracking #' : 'US/UK domestic tracking #'}</label>
              <input id="lg-inland" className={inputBase} placeholder="e.g. SF1234567890"
                value={inlandTracking} onChange={e => setInlandTracking(e.target.value)} />
            </div>
            {isChina ? (
              <div>
                <label htmlFor="lg-container" className={labelBase}>Container number</label>
                <input id="lg-container" className={inputBase} placeholder="e.g. MRKU4521376"
                  value={containerNumber} onChange={e => setContainerNumber(e.target.value.toUpperCase())} />
              </div>
            ) : (
              <div>
                <label htmlFor="lg-eta" className={labelBase}>Est. arrival in Kenya</label>
                <input id="lg-eta" type="date" className={inputBase}
                  value={estArrival} onChange={e => setEstArrival(e.target.value)} />
              </div>
            )}
          </div>

          {/* One-click check on the tracking platform + client tracking link */}
          {(inlandLookup || containerLookup) && (
            <div className="flex flex-wrap gap-2">
              {inlandLookup && (
                <a href={inlandLookup} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-[11px] font-black uppercase tracking-widest text-gray-600 hover:border-[#3D8593] hover:text-[#3D8593] transition-all">
                  <MagnifyingGlass size={14} weight="bold" /> Check {isChina ? 'inland' : 'parcel'} on 17TRACK
                </a>
              )}
              {containerLookup && (
                <a href={containerLookup} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-[11px] font-black uppercase tracking-widest text-gray-600 hover:border-[#3D8593] hover:text-[#3D8593] transition-all">
                  <MagnifyingGlass size={14} weight="bold" /> Check container
                </a>
              )}
            </div>
          )}

          <button
            onClick={copyTrackingLink}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white border border-gray-200 hover:border-[#3D8593] transition-colors text-left"
          >
            <span className="flex items-center gap-2 min-w-0">
              <LinkSimple size={16} className="text-gray-400 shrink-0" />
              <span className="text-xs font-medium text-gray-500 truncate">{clientTrackingLink}</span>
            </span>
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#3D8593]">
              {copiedLink ? <><CheckCircle size={13} weight="fill" className="text-emerald-500" /> Copied</> : <><Copy size={13} weight="bold" /> Copy for client</>}
            </span>
          </button>

          {isChina && containerMates.length > 0 && (
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 cursor-pointer">
              <input type="checkbox" checked={cascade} onChange={e => setCascade(e.target.checked)} className="accent-[#3D8593] w-4 h-4" />
              <span className="flex items-center gap-2 text-[12px] font-bold text-[#3D8593]">
                <Stack size={15} weight="duotone" /> Apply this shipping update to all {containerMates.length + 1} orders in container {containerNumber}
              </span>
            </label>
          )}

          {/* Pipeline */}
          <div>
            <span className={labelBase}>Tracking stage — where is it now?</span>
            <div className="space-y-1.5">
              {PIPELINE.map((s, i) => {
                const active = s === status;
                const done = PIPELINE.indexOf(status) > i;
                return (
                  <button
                    key={s}
                    onClick={() => chooseStatus(s)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all border ${active
                      ? 'border-[#3D8593] bg-[#0f1a1c] text-white'
                      : done
                        ? 'border-transparent bg-teal-50/60 text-[#3D8593]'
                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-[#3D8593]' : done ? 'bg-[#3D8593]/20' : 'bg-gray-100'}`}>
                      {done ? <CheckCircle size={14} weight="fill" className="text-[#3D8593]" /> : <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-gray-300'}`} />}
                    </span>
                    <span className="text-sm font-bold flex-1">{internalLabel(s, origin)}</span>
                    {active && <span className="text-[9px] font-black uppercase tracking-widest text-[#7fc2ce]">Now</span>}
                  </button>
                );
              })}
            </div>

            {next && (
              <button
                onClick={() => chooseStatus(next)}
                className="mt-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#3D8593] hover:gap-3 transition-all"
              >
                Advance to: {internalLabel(next, origin)} <ArrowRight size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Client-facing mirror + grace note */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <MapPin size={13} weight="duotone" /> Customer sees
            </div>
            <p className="text-sm font-bold text-gray-900">{clientStatus} <span className="text-gray-300 font-medium">· {internalToProgress(status)}% on their tracker</span></p>
            {status === InternalStatus.ARRIVED_PORT && (
              <p className="text-[11px] text-gray-400 font-medium">
                Grace clock started — after {GRACE_DAYS} days this order surfaces in your Action Center to confirm it's ready.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {intentAtStatus && (
              <button
                onClick={() => handleDraft(intentAtStatus)}
                disabled={saving}
                className="flex-1 py-4 rounded-full bg-[#25D366] text-white font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#1eb955] transition-colors disabled:opacity-40"
              >
                <ChatCircleText size={16} weight="fill" /> Save &amp; draft "{intentAtStatus}" message
              </button>
            )}
            <button
              onClick={handleSaveAndClose}
              disabled={saving}
              className="btn-vibrant-teal py-4 px-8 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving ? (<><ArrowClockwise size={16} weight="bold" className="animate-spin" /> Saving…</>) : (<><CheckCircle size={16} weight="fill" /> Save tracking</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsPanel;
