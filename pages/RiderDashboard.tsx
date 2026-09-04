import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  NavigationArrow, Package, Camera, CheckCircle, CircleNotch, WarningCircle,
  Phone, MapPin, Receipt, CurrencyDollar,
} from '@phosphor-icons/react';
import {
  Delivery, DeliveryStatus, fetchRiderJobs, riderUpdateJob, uploadReceipt, emailDeliveryReceipt,
  riderSetEta,
} from '../services/deliveries';
import { originById, ETA_CHOICES, EtaChoice, etaLabel, sinceLabel } from '../utils/delivery';
import RiderAlerts from '../components/RiderAlerts';

/**
 * A rider's own page — /rider/<token>.
 *
 * No account, no password, no app to install: the link IS the credential, and
 * it is revoked by rotating it or deactivating the rider. Built thumb-first,
 * because it is read on a phone at the side of a road.
 *
 * The one thing it exists for: the courier receipt. Today the rider photographs
 * it, sends it to the owner, and the owner forwards it to the customer. Upload
 * it here and the customer sees it on their own link straight away.
 */

const money = (n?: number) => (n == null ? '—' : `KES ${n.toLocaleString()}`);

const RiderDashboard: React.FC = () => {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riderName, setRiderName] = useState<string>('');
  const [jobs, setJobs] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  /**
   * The PIN is kept on this phone so a rider signs in once, not at every
   * traffic light. Losing the phone is handled by revoking the link.
   */
  const pinKey = `lg.rider.pin.${token.slice(0, 8)}`;
  const [pin, setPin] = useState<string>(() => {
    try { return localStorage.getItem(pinKey) || ''; } catch { return ''; }
  });
  const [needsPin, setNeedsPin] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [checking, setChecking] = useState(false);

  const load = (withPin = pin) => {
    setLoading(true);
    fetchRiderJobs(token, withPin || undefined).then(res => {
      if (res.needsPin) {
        setNeedsPin(true);
        setRiderName(res.riderName || '');
        setError(res.error || null);
      } else if (!res.ok) {
        setError(res.error || 'That link did not work.');
      } else {
        setNeedsPin(false);
        setError(null);
        setRiderName(res.riderName || '');
        setJobs(res.jobs);
        setEarned(res.earned30d || 0);
      }
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitPin = () => {
    const entered = pinEntry.trim();
    if (entered.length < 4) return;
    setChecking(true);
    fetchRiderJobs(token, entered).then(res => {
      setChecking(false);
      if (res.needsPin || !res.ok) { setError(res.error || 'That PIN is not right.'); return; }
      try { localStorage.setItem(pinKey, entered); } catch { /* private window */ }
      setPin(entered);
      setNeedsPin(false);
      setError(null);
      setRiderName(res.riderName || '');
      setJobs(res.jobs);
      setEarned(res.earned30d || 0);
      setPinEntry('');
    });
  };

  const setStatus = async (job: Delivery, status: DeliveryStatus) => {
    setBusy(job.id);
    const res = await riderUpdateJob(token, job.id, pin || undefined, { status });
    setBusy(null);
    if (!res.ok) { setError(res.error || 'Could not save that.'); return; }
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1a1c] flex items-center justify-center">
        <CircleNotch size={30} className="text-[#3D8593] animate-spin" />
      </div>
    );
  }

  /* The link says which rider. The PIN says it's really them. */
  if (needsPin) {
    return (
      <div className="min-h-screen bg-[#0f1a1c] flex items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#3D8593] mb-2 text-center">LegitGrinder</p>
          <h1 className="text-xl font-bold text-white mb-1 text-center">
            {riderName ? `Hi ${riderName}` : 'Sign in'}
          </h1>
          <p className="text-neutral-400 text-[13px] font-light text-center mb-6">
            Enter your PIN to see your deliveries.
          </p>

          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinEntry}
            onChange={e => { setPinEntry(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') submitPin(); }}
            placeholder="••••"
            className="w-full h-16 bg-white/5 border border-white/20 rounded-2xl text-center text-2xl tracking-[0.5em] font-black text-white outline-none focus:border-[#3D8593] placeholder:text-neutral-600"
          />

          {error && <p className="text-[12px] font-bold text-rose-400 mt-3 text-center">{error}</p>}

          <button
            onClick={submitPin}
            disabled={checking || pinEntry.length < 4}
            className="w-full h-14 mt-4 rounded-full bg-white text-[#0f1a1c] font-black uppercase text-[11px] tracking-widest disabled:opacity-40"
          >
            {checking ? 'Checking…' : 'Sign in'}
          </button>

          <p className="text-neutral-500 text-[11px] text-center mt-5 leading-relaxed">
            Forgotten it? Ask LegitGrinder to set you a new one.
          </p>
        </div>
      </div>
    );
  }

  if (error && !jobs.length) {
    return (
      <div className="min-h-screen bg-[#0f1a1c] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <WarningCircle size={40} weight="duotone" className="text-[#FF9900] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">This link isn't working</h1>
          <p className="text-neutral-400 text-sm font-light leading-relaxed">{error}</p>
          <p className="text-neutral-500 text-xs mt-4">Ask LegitGrinder to send you a fresh link.</p>
        </div>
      </div>
    );
  }

  const open = jobs.filter(j => j.status !== 'delivered');
  const done = jobs.filter(j => j.status === 'delivered');

  return (
    <div className="min-h-screen bg-[#0f1a1c] pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#3D8593] mb-2">LegitGrinder · Deliveries</p>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          {riderName ? `Hi ${riderName.split(' ')[0]}` : 'Your jobs'}
        </h1>
        <p className="text-neutral-400 text-sm font-light mb-7">
          {open.length === 0
            ? 'Nothing waiting on you right now.'
            : `${open.length} job${open.length === 1 ? '' : 's'} to do.`}
        </p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <WarningCircle size={18} weight="duotone" className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-200 font-medium">{error}</p>
          </div>
        )}

        <RiderAlerts token={token} pin={pin || undefined} onNeedsPin={() => setNeedsPin(true)} />

        <div className="space-y-4">
          {open.map(job => (
            <JobCard key={job.id} job={job} token={token} pin={pin || undefined} busy={busy === job.id}
              onStatus={setStatus} onSaved={load} onError={setError} />
          ))}
        </div>

        {done.length > 0 && (
          <>
            <div className="flex items-baseline justify-between mt-10 mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">
                Delivered · last 30 days
              </p>
              {/* What they have earned. The first thing any rider wants to know. */}
              <p className="text-[11px] font-black text-emerald-400">{money(earned)}</p>
            </div>
            <div className="space-y-3">
              {done.map(job => (
                <div key={job.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{job.customerName || 'Customer'}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{job.dropLabel || job.itemDescription}</p>
                  </div>
                  <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                    {money(job.deliveryFeeKES)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ── One job ─────────────────────────────────────────────────────────────── */

const JobCard: React.FC<{
  job: Delivery;
  token: string;
  busy: boolean;
  onStatus: (j: Delivery, s: DeliveryStatus) => void;
  pin?: string;
  onSaved: () => void;
  onError: (m: string) => void;
}> = ({ job, token, busy, onStatus, onSaved, onError, pin }) => {
  const [service, setService] = useState(job.parcelService || '');
  const [fee, setFee] = useState(job.parcelFeeKES != null ? String(job.parcelFeeKES) : '');
  const [ref, setRef] = useState(job.parcelRef || '');
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const origin = originById(job.originId);
  const navUrl = job.deliveryType !== 'parcel' && job.dropLat != null && job.dropLng != null
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${job.dropLat},${job.dropLng}&travelmode=driving`
    : null;

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const up = await uploadReceipt(file, job.id);
    if (up.error || !up.url) { setUploading(false); onError(up.error || 'The upload failed.'); return; }
    const res = await riderUpdateJob(token, job.id, pin, { receiptUrl: up.url });
    setUploading(false);
    if (!res.ok) { onError(res.error || 'Saved the photo but could not attach it.'); return; }
    // Their copy, straight away — this is the WhatsApp forwarding that the
    // whole feature exists to remove. Best-effort: the receipt is already on
    // their tracking link whether or not the email lands.
    emailDeliveryReceipt(token, job.id).catch(() => {});
    onSaved();
  };

  /**
   * Tell the customer and the office where you have got to.
   *
   * Optimistic: the chip lights up the instant it is tapped. A rider taps this
   * one-handed at a junction — waiting on a round trip over a patchy 3G
   * connection before anything moves reads as a dead button, and they tap it
   * again. Rolled back if the save actually fails.
   */
  const [etaBusy, setEtaBusy] = useState(false);
  const [etaLocal, setEtaLocal] = useState<{ code: string; minutes?: number; at: string } | null>(null);
  const currentEta = etaLocal || (job.riderEtaCode
    ? { code: job.riderEtaCode, minutes: job.riderEtaMinutes, at: job.riderEtaAt || new Date().toISOString() }
    : null);

  const chooseEta = async (choice: EtaChoice) => {
    const same = currentEta?.code === choice.code && currentEta?.minutes === choice.minutes;
    const next = same ? null : { code: choice.code, minutes: choice.minutes, at: new Date().toISOString() };
    const previous = etaLocal;
    setEtaLocal(next);
    setEtaBusy(true);
    const res = await riderSetEta(token, job.id, pin, next ? choice.code : null, next ? choice.minutes ?? null : null);
    setEtaBusy(false);
    if (!res.ok) { setEtaLocal(previous); onError(res.error || 'Could not update your status.'); return; }
    onSaved();
  };

  const saveParcel = async () => {
    const res = await riderUpdateJob(token, job.id, pin, {
      parcelService: service.trim() || undefined,
      parcelFeeKES: fee.trim() ? parseInt(fee, 10) : undefined,
      parcelRef: ref.trim() || undefined,
    });
    if (!res.ok) { onError(res.error || 'Could not save that.'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  const field = 'w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-[#3D8593] transition-colors placeholder:text-neutral-500';

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-white truncate">{job.customerName || 'Customer'}</p>
            {job.itemDescription && (
              <p className="text-[12px] text-neutral-400 font-light mt-0.5">{job.itemDescription}</p>
            )}
          </div>
          <div className="shrink-0 text-right space-y-1">
            <span className={`inline-block px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
              job.status === 'collected' ? 'bg-[#FF9900]/15 text-[#FF9900]' : 'bg-[#3D8593]/20 text-[#7fc2ce]'
            }`}>
              {job.status === 'collected' ? 'Picked up' : 'To collect'}
            </span>
            {/* Where the job came from — one the customer booked themselves
                reads differently from one sent by hand. */}
            <span className="block text-[8px] font-black uppercase tracking-widest text-neutral-500">
              {job.source === 'customer' ? 'Booked by customer' : 'From LegitGrinder'}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-[12px] text-neutral-300 flex items-start gap-2">
            <Package size={15} weight="duotone" className="text-[#3D8593] shrink-0 mt-0.5" />
            From {origin.name}{job.isBulky && <span className="text-[#FF9900] font-bold"> · bulky</span>}
          </p>
          <p className="text-[12px] text-neutral-300 flex items-start gap-2">
            <MapPin size={15} weight="duotone" className="text-[#FF9900] shrink-0 mt-0.5" />
            {job.deliveryType === 'parcel'
              ? <>Drop at {job.courierName || 'the courier'} in town</>
              : <>{job.dropLabel || 'Pinned location'}{job.distanceKm != null && <span className="text-neutral-500"> · ~{job.distanceKm} km</span>}</>}
          </p>
          <p className="text-[12px] text-neutral-300 flex items-center gap-2">
            <CurrencyDollar size={15} weight="duotone" className="text-emerald-400 shrink-0" />
            Your fee: <strong className="text-white">{money(job.deliveryFeeKES)}</strong>
          </p>
        </div>

        {/* The door, not the gate. A pin gets a rider to the estate; without
            this they stand outside ringing the customer, which is the single
            most common way a delivery loses ten minutes. */}
        {job.deliveryType !== 'parcel'
          && (job.dropBuilding || job.dropUnit || job.dropGate || job.dropInstructions) && (
          <div className="bg-[#3D8593]/10 border border-[#3D8593]/25 rounded-2xl p-4 mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#7fc2ce] mb-2">
              Finding the door
            </p>
            <div className="space-y-1 text-[12.5px]">
              {job.dropBuilding && (
                <p className="text-white"><span className="text-neutral-400">Building</span> {job.dropBuilding}</p>
              )}
              {job.dropUnit && (
                <p className="text-white"><span className="text-neutral-400">House / unit</span> {job.dropUnit}</p>
              )}
              {job.dropGate && (
                <p className="text-white"><span className="text-neutral-400">Gate</span> {job.dropGate}</p>
              )}
              {job.dropInstructions && (
                <p className="text-neutral-300 pt-1.5 mt-1.5 border-t border-white/10 leading-relaxed">
                  {job.dropInstructions}
                </p>
              )}
            </div>
          </div>
        )}

        {/* What the courier will ask for at the counter. Read it straight off
            the phone rather than calling anyone back. */}
        {job.deliveryType === 'parcel' && (job.receiverName || job.receiverDestination) && (
          <div className="bg-[#FF9900]/10 border border-[#FF9900]/25 rounded-2xl p-4 mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF9900] mb-2">
              Give the courier
            </p>
            <div className="space-y-1 text-[12.5px]">
              {job.receiverName && (
                <p className="text-white"><span className="text-neutral-400">Receiver</span> {job.receiverName}</p>
              )}
              {job.receiverPhone && (
                <p className="text-white">
                  <span className="text-neutral-400">Phone</span>{' '}
                  <a href={`tel:${job.receiverPhone}`} className="underline decoration-white/30">{job.receiverPhone}</a>
                </p>
              )}
              {job.receiverDestination && (
                <p className="text-white"><span className="text-neutral-400">Going to</span> {job.receiverDestination}</p>
              )}
              {job.parcelNotes && (
                <p className="text-neutral-300 pt-1.5 mt-1.5 border-t border-white/10 leading-relaxed">{job.parcelNotes}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {navUrl && (
            <a href={navUrl} target="_blank" rel="noopener noreferrer"
              className="h-12 rounded-full bg-[#3D8593] text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
              <NavigationArrow size={15} weight="fill" /> Navigate
            </a>
          )}
          {job.customerPhone && (
            <a href={`tel:${job.customerPhone}`}
              className={`h-12 rounded-full border border-white/20 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ${navUrl ? '' : 'col-span-2'}`}>
              <Phone size={15} weight="fill" /> Call
            </a>
          )}
        </div>

        {/* Where you are. One tap, and the customer and the office both see it
            without anyone making a phone call. Hidden once delivered — a
            status on a finished job is just clutter. */}
        {job.status !== 'delivered' && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-baseline justify-between gap-2 mb-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">
                Tell them where you are
              </p>
              {currentEta && (
                <span className="text-[10px] font-bold text-neutral-500">
                  {sinceLabel(currentEta.at)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ETA_CHOICES.map(c => {
                const on = currentEta?.code === c.code && currentEta?.minutes === c.minutes;
                return (
                  <button
                    key={`${c.code}-${c.minutes ?? 0}`}
                    onClick={() => chooseEta(c)}
                    disabled={etaBusy}
                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-60 ${
                      on
                        ? 'bg-[#3D8593] text-white'
                        : 'bg-white/5 border border-white/15 text-neutral-300 hover:border-white/30'
                    }`}
                  >
                    {c.short}
                  </button>
                );
              })}
            </div>
            {currentEta && (
              <p className="text-[11px] text-neutral-500 mt-2.5">
                They can see: <span className="text-neutral-300 font-medium">{etaLabel(currentEta.code, currentEta.minutes)}</span>
                {' '}· tap again to clear
              </p>
            )}
          </div>
        )}
      </div>

      {/* Courier leg — parcel jobs only. A doorstep job never sees this. */}
      {job.deliveryType === 'parcel' && (
      <div className="border-t border-white/10 p-5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
          {job.courierName ? `At ${job.courierName}` : 'At the courier'} — the customer pays, you record it
        </p>

        {job.parcelReceiptUrl ? (
          <a href={job.parcelReceiptUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4">
            <CheckCircle size={20} weight="fill" className="text-emerald-400 shrink-0" />
            <span className="text-[12px] text-emerald-200 font-medium">
              Receipt uploaded — the customer has it. Tap to view.
            </span>
          </a>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={onFile} className="hidden" />
            <button onClick={pickFile} disabled={uploading}
              className="w-full h-12 rounded-full bg-[#FF9900] text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
              {uploading
                ? <><CircleNotch size={15} className="animate-spin" /> Uploading…</>
                : <><Camera size={16} weight="fill" /> Photograph their receipt</>}
            </button>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input value={service} onChange={e => setService(e.target.value)}
            placeholder={job.courierName || "Which courier"} className={field} />
          <input value={fee} onChange={e => setFee(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric" placeholder="What they paid" className={field} />
        </div>
        <input value={ref} onChange={e => setRef(e.target.value)}
          placeholder="Waybill / reference number" className={field} />
        <button onClick={saveParcel}
          className="w-full h-11 rounded-full border border-white/20 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
          {saved ? <><CheckCircle size={15} weight="fill" className="text-emerald-400" /> Saved</> : <><Receipt size={15} weight="duotone" /> Save these details</>}
        </button>
      </div>
      )}

      {/* Progress */}
      <div className="border-t border-white/10 p-5">
        {job.status === 'assigned' ? (
          <button onClick={() => onStatus(job, 'collected')} disabled={busy}
            className="w-full h-12 rounded-full bg-white text-[#0f1a1c] font-black uppercase text-[10px] tracking-widest disabled:opacity-50">
            {busy ? 'Saving…' : "I've picked it up"}
          </button>
        ) : (
          <button onClick={() => onStatus(job, 'delivered')} disabled={busy}
            className="w-full h-12 rounded-full bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-50">
            {busy ? 'Saving…' : job.deliveryType === 'parcel' ? 'Handed to the courier' : 'Mark delivered'}
          </button>
        )}
      </div>
    </div>
  );
};

export default RiderDashboard;
