import React, { useEffect, useMemo, useState } from 'react';
import {
  Truck, Plus, LinkSimple, Check, Trash, WarningCircle, Receipt, ArrowsClockwise, Motorcycle,
  BellRinging,
} from '@phosphor-icons/react';
import { notifyRider } from '../services/push';
import { Delivery, fetchDeliveries, createDelivery, deleteDelivery, updateDelivery } from '../services/deliveries';
import { Rider, fetchRiders } from '../services/riders';
import {
  ORIGINS, originById, quoteDelivery, estimatedRoadKm, fetchRoadKm,
  etaLabel, sinceLabel, etaIsStale,
} from '../utils/delivery';

/**
 * Admin → the delivery jobs themselves.
 *
 * Creating one produces two links: the rider's (they already have it — it's
 * their standing dashboard) and the customer's, which is per-delivery and the
 * thing you send so they can watch it and collect the courier receipt.
 *
 * The drop location is pasted as a Google Maps link or raw coordinates, which
 * is what actually arrives on WhatsApp when someone shares their pin.
 */

const money = (n?: number) => (n == null ? '—' : `KES ${n.toLocaleString()}`);

/** Pull coordinates out of whatever the customer sent. */
export const parseLatLng = (raw: string): { lat: number; lng: number } | null => {
  if (!raw) return null;
  // "-1.2854649, 36.8266681" or a maps URL carrying @lat,lng or q=lat,lng
  // Order matters. !3d/!4d is the PLACE pin; @lat,lng is only the map's
  // viewport centre — on a real Dynamic Mall link the two are ~280m apart, so
  // taking @ first would quietly bake that error into every fee.
  const patterns = [
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&]q=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
};

/** Hand-off from an invoice: everything we already know, so nothing is retyped. */
export interface DeliveryPrefill {
  customerName?: string;
  customerPhone?: string;
  itemDescription?: string;
  invoiceNumber?: string;
  /** Bumped by the caller so the same invoice can be sent through twice. */
  nonce: number;
}

interface Props {
  prefill?: DeliveryPrefill | null;
  /** Told once the prefill has been consumed, so it is not re-applied. */
  onPrefillUsed?: () => void;
}

const DeliveriesPanel: React.FC<Props> = ({ prefill, onPrefillUsed }) => {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  /** Result of the last push — a buzz you cannot see is a buzz you cannot trust. */
  const [alerted, setAlerted] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  // Link builder — the owner's two decisions, encoded into the URL.
  const [building, setBuilding] = useState(false);
  const [linkOrigin, setLinkOrigin] = useState<string>('cbd');
  const [linkLarge, setLinkLarge] = useState(false);
  const [linkItem, setLinkItem] = useState('');
  const [linkRef, setLinkRef] = useState('');

  const buildLink = () => {
    const q = new URLSearchParams();
    if (linkOrigin !== 'cbd') q.set('from', linkOrigin);
    if (linkLarge) q.set('large', '1');
    if (linkItem.trim()) q.set('item', linkItem.trim());
    if (linkRef.trim()) q.set('order', linkRef.trim());
    const qs = q.toString();
    return `${window.location.origin}/request-delivery${qs ? '?' + qs : ''}`;
  };

  // New-job form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [item, setItem] = useState('');
  const [originId, setOriginId] = useState('cbd');
  const [pin, setPin] = useState('');
  const [dropLabel, setDropLabel] = useState('');
  const [bulky, setBulky] = useState(false);
  const [riderId, setRiderId] = useState('');
  const [km, setKm] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(false);

  /**
   * Doorstep or parcel — the choice that decides whether the rider's phone
   * shows the courier section and the receipt upload at all.
   */
  const [mode, setMode] = useState<'doorstep' | 'parcel'>('doorstep');
  const [courier, setCourier] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverDest, setReceiverDest] = useState('');
  const [parcelNotes, setParcelNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  /** Doorstep address detail — what gets the rider past the gate. */
  const [dropBuilding, setDropBuilding] = useState('');
  const [dropUnit, setDropUnit] = useState('');
  const [dropGate, setDropGate] = useState('');
  const [dropInstructions, setDropInstructions] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([fetchDeliveries(), fetchRiders()]).then(([d, r]) => {
      setRows(d); setRiders(r);
      const def = r.find(x => x.isDefault && x.active) || r.find(x => x.active);
      setRiderId(prev => prev || def?.id || '');
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  /**
   * An invoice was sent here with "Arrange delivery". Open the form with what
   * we already know filled in — the whole point is that the owner does not
   * retype a name, a phone and an item he has already typed once.
   *
   * Keyed on nonce, not on the object, so sending the SAME invoice through a
   * second time still reopens the form.
   */
  useEffect(() => {
    if (!prefill) return;
    setAdding(true);
    setBuilding(false);
    setCustomerName(prefill.customerName || '');
    setCustomerPhone(prefill.customerPhone || '');
    setItem(prefill.itemDescription || '');
    setInvoiceNumber(prefill.invoiceNumber || '');
    setError(null);
    onPrefillUsed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.nonce]);

  /**
   * Live-ish: the rider's status is only useful if it is current, and nobody
   * is going to sit here pressing refresh.
   *
   * Polling rather than a realtime subscription — one small query every 30s
   * against a handful of rows, and it cannot silently stop working the way a
   * dropped socket can. It refreshes `now` too, so "4 min ago" ages on screen
   * instead of freezing at whatever it said when the tab was opened.
   *
   * Paused when the tab is hidden. A dashboard left open on a second monitor
   * all week should not spend the week querying.
   */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      setNow(Date.now());
      fetchDeliveries().then(setRows).catch(() => { /* next tick will retry */ });
    };
    const t = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const parsed = useMemo(() => parseLatLng(pin), [pin]);
  /** Filled in when a shortened link had to be resolved server-side. */
  const [resolved, setResolved] = useState<{ lat: number; lng: number } | null>(null);
  const [resolving, setResolving] = useState(false);
  const coords = parsed || resolved;

  /**
   * A customer sharing their location on WhatsApp sends a maps.app.goo.gl
   * link, which carries no coordinates until it is followed — and the browser
   * can't follow it. Hand it to the server instead.
   */
  useEffect(() => {
    setResolved(null);
    const raw = pin.trim();
    if (parsed || !/^https?:\/\//i.test(raw)) return;
    let dead = false;
    setResolving(true);
    fetch('/api/resolve-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: raw }),
    })
      .then(r => r.json())
      .then(d => {
        if (dead) return;
        if (d?.success) {
          setResolved({ lat: d.lat, lng: d.lng });
          if (d.placeName && !dropLabel.trim()) setDropLabel(d.placeName);
        }
      })
      .catch(() => { /* the manual coordinate path still works */ })
      .finally(() => { if (!dead) setResolving(false); });
    return () => { dead = true; };
  }, [pin, parsed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure whenever the pin or the pickup point changes.
  useEffect(() => {
    if (!coords) { setKm(null); return; }
    let dead = false;
    setMeasuring(true);
    const o = originById(originId);
    fetchRoadKm({ lat: o.lat, lng: o.lng }, coords).then(({ km }) => {
      if (dead) return;
      setKm(km); setMeasuring(false);
    });
    return () => { dead = true; };
  }, [coords, originId]);

  /**
   * A parcel is a flat drop at a counter in town: every courier office falls
   * inside the minimum fare from either pickup point, so measuring a route
   * returns the same number with extra steps. Priced identically to the
   * customer-facing estimator, deliberately — the two must never disagree.
   */
  const quote = mode === 'parcel'
    ? quoteDelivery(0, bulky)
    : (km != null ? quoteDelivery(km, bulky) : null);

  const save = async () => {
    // A parcel has no destination pin — the rider goes to a counter in town,
    // not to the receiver. Demanding one would make the job unbookable.
    if (mode === 'doorstep' && !coords) {
      setError('Paste the customer\'s pin — a Google Maps link or "lat, lng".'); return;
    }
    if (mode === 'parcel' && !courier.trim()) {
      setError('Which courier is it going with? The customer chooses; type what they told you.'); return;
    }
    setBusy('new'); setError(null);
    const res = await createDelivery({
      riderId: riderId || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      itemDescription: item.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      originId,
      dropLat: coords?.lat, dropLng: coords?.lng,
      dropLabel: dropLabel.trim() || undefined,
      distanceKm: mode === 'parcel' ? undefined : quote?.km,
      isBulky: bulky,
      deliveryFeeKES: quote?.total,
      deliveryType: mode,
      courierName: mode === 'parcel' ? courier.trim() : undefined,
      receiverName: mode === 'parcel' ? (receiverName.trim() || customerName.trim()) : undefined,
      receiverPhone: mode === 'parcel' ? (receiverPhone.trim() || customerPhone.trim()) : undefined,
      receiverDestination: mode === 'parcel' ? receiverDest.trim() : undefined,
      parcelNotes: mode === 'parcel' ? parcelNotes.trim() : undefined,
      dropBuilding: mode === 'doorstep' ? dropBuilding.trim() : undefined,
      dropUnit: mode === 'doorstep' ? dropUnit.trim() : undefined,
      dropGate: mode === 'doorstep' ? dropGate.trim() : undefined,
      dropInstructions: mode === 'doorstep' ? dropInstructions.trim() : undefined,
    });
    setBusy(null);
    if (!res.success) {
      setError(/relation|does not exist|schema cache/i.test(res.error || '')
        ? 'Run add_deliveries.sql in Supabase first — the table does not exist yet.'
        : res.error || 'Could not create that delivery.');
      return;
    }
    // Tell the rider before clearing the form — the fields are the message.
    if (riderId) {
      await alertRider(riderId, {
        item: item.trim() || undefined,
        where: dropLabel.trim() || undefined,
        fee: quote?.total,
      });
    }

    setCustomerName(''); setCustomerPhone(''); setItem(''); setPin(''); setDropLabel('');
    setBulky(false); setKm(null); setAdding(false);
    setMode('doorstep'); setCourier(''); setReceiverName(''); setReceiverPhone('');
    setReceiverDest(''); setParcelNotes(''); setInvoiceNumber('');
    setDropBuilding(''); setDropUnit(''); setDropGate(''); setDropInstructions('');
    load();
  };

  /**
   * Buzz the rider's phone about a job now on their list.
   *
   * Never allowed to fail the assignment. The delivery row is already saved by
   * the time this runs; if the push does not land, the job is still assigned
   * and the rider still sees it when they open the app. What must NOT happen is
   * a silent failure — so the outcome is always reported either way.
   */
  const alertRider = async (rid: string, about: { item?: string; where?: string; fee?: number }) => {
    const rider = riders.find(r => r.id === rid);
    if (!rider) return;
    const first = rider.name.split(' ')[0];

    const bits = [about.item || 'A package', about.where ? `→ ${about.where}` : '']
      .filter(Boolean).join(' ');
    const res = await notifyRider({
      riderId: rid,
      riderToken: rider.accessToken,
      title: 'New delivery for you',
      body: about.fee ? `${bits} · KES ${about.fee.toLocaleString()}` : bits,
    });

    setAlerted(res.success
      ? { ok: true, text: `${first}'s phone buzzed${res.sent > 1 ? ` (${res.sent} devices)` : ''}.` }
      : { ok: false, text: `Assigned, but ${first} was not alerted — ${res.error}` });
  };

  const copyCustomerLink = (d: Delivery) => {
    navigator.clipboard.writeText(`${window.location.origin}/delivery/${d.customerToken}`).then(() => {
      setCopied(d.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const remove = async (d: Delivery) => {
    if (!confirm(`Delete this delivery for ${d.customerName || 'the customer'}?`)) return;
    setBusy(d.id);
    await deleteDelivery(d.id);
    setBusy(null); load();
  };

  const reassign = async (d: Delivery, newRiderId: string) => {
    setBusy(d.id);
    const res = await updateDelivery(d.id, { riderId: newRiderId });
    // Only buzz a rider the job actually moved TO, and only if it moved.
    if (res.success && newRiderId && newRiderId !== d.riderId) {
      await alertRider(newRiderId, {
        item: d.itemDescription,
        where: d.dropLabel,
        fee: d.deliveryFeeKES,
      });
    }
    setBusy(null); load();
  };

  const input = 'w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors placeholder:text-neutral-300';
  const lbl = 'text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5';

  const statusChip = (s: string) => s === 'delivered'
    ? 'bg-emerald-50 text-emerald-600'
    : s === 'collected' ? 'bg-amber-50 text-[#FF9900]' : 'bg-teal-50 text-[#3D8593]';

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-[#3D8593] flex items-center justify-center">
            <Truck size={18} weight="duotone" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Deliveries {!loading && <span className="text-gray-400 font-bold">({rows.filter(r => r.status !== 'delivered').length} open)</span>}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Assign a rider · send the customer their link
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setBuilding(b => !b); setError(null); }}
            className="px-4 py-2.5 rounded-xl bg-[#25D366]/10 text-[#1eb955] text-[10px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-colors flex items-center gap-2"
            title="Build the link you send a customer who wants delivery"
          >
            <LinkSimple size={13} weight="bold" /> Delivery link
          </button>
          <button onClick={load} className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-colors">
            <ArrowsClockwise size={14} weight="bold" />
          </button>
          <button
            onClick={() => { setAdding(a => !a); setError(null); }}
            className="px-4 py-2.5 rounded-xl bg-[#3D8593] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
          >
            <Plus size={13} weight="bold" /> New delivery
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
            <WarningCircle size={16} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-900">{error}</p>
          </div>
        )}

        {alerted && (
          <div className={`flex items-start gap-3 rounded-xl p-4 border ${
            alerted.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
          }`}>
            <BellRinging size={16} weight="duotone" className={`shrink-0 mt-0.5 ${alerted.ok ? 'text-emerald-600' : 'text-[#FF9900]'}`} />
            <p className={`text-sm font-medium flex-1 ${alerted.ok ? 'text-emerald-900' : 'text-amber-900'}`}>{alerted.text}</p>
            <button onClick={() => setAlerted(null)} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600">
              Dismiss
            </button>
          </div>
        )}

        {/* THE LINK BUILDER. Two things the customer cannot know — where the
            package is, and how big it is — get decided here and ride in the
            link, so their page never asks them. */}
        {building && (
          <div className="bg-[#0f1a1c] rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Build the link you send them
            </p>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">
                Where is the package?
              </label>
              <div className="grid sm:grid-cols-2 gap-2">
                {ORIGINS.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setLinkOrigin(o.id)}
                    className={`text-left px-4 py-3 rounded-xl border transition-all ${linkOrigin === o.id
                      ? 'border-[#3D8593] bg-[#3D8593]/15'
                      : 'border-white/15 hover:border-white/30'}`}
                  >
                    <span className={`block text-[12px] font-black ${linkOrigin === o.id ? 'text-[#7fc2ce]' : 'text-white'}`}>{o.name}</span>
                    <span className="block text-[10px] font-medium text-neutral-500 mt-0.5">{o.adminDetail}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={linkLarge} onChange={e => setLinkLarge(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#FF9900]" />
              <span>
                <span className="block text-[12.5px] font-bold text-white">Bigger than a 20-litre jerrycan</span>
                <span className="block text-[11px] font-medium text-neutral-500">
                  Adds KES 150. They see it as an explained line, not a box to tick.
                </span>
              </span>
            </label>

            <div className="grid sm:grid-cols-2 gap-2">
              <input value={linkItem} onChange={e => setLinkItem(e.target.value)}
                placeholder="What is it? (optional)"
                className="w-full h-11 bg-white/5 border border-white/15 rounded-xl px-4 text-sm font-medium text-white outline-none focus:border-[#3D8593] placeholder:text-neutral-600" />
              <input value={linkRef} onChange={e => setLinkRef(e.target.value)}
                placeholder="Order code (optional)"
                className="w-full h-11 bg-white/5 border border-white/15 rounded-xl px-4 text-sm font-medium text-white outline-none focus:border-[#3D8593] placeholder:text-neutral-600" />
            </div>

            <p className="text-[11px] font-mono text-neutral-500 break-all bg-black/30 rounded-lg px-3 py-2">
              {buildLink()}
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(buildLink()).then(() => {
                  setCopied('built-link');
                  setTimeout(() => setCopied(null), 2200);
                });
              }}
              className="w-full h-11 rounded-xl bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
            >
              {copied === 'built-link'
                ? <><Check size={14} weight="bold" /> Copied — paste it to them</>
                : <><LinkSimple size={14} weight="bold" /> Copy this link</>}
            </button>
          </div>
        )}

        {adding && (
          <div className="bg-neutral-50/60 border border-neutral-100 rounded-2xl p-5 space-y-4">
            {invoiceNumber && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5">
                <Receipt size={14} weight="duotone" className="text-[#3D8593] shrink-0" />
                <p className="text-[12px] font-bold text-[#276a76]">
                  From invoice {invoiceNumber} — check the details, then choose how it travels.
                </p>
              </div>
            )}

            {/* THE choice this whole form turns on. Parcel puts the courier
                section and the receipt upload on the rider's phone; doorstep
                deliberately never shows either. */}
            <div>
              <label className={lbl}>How does it travel?</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {([
                  { id: 'doorstep', name: 'Doorstep', note: 'Rider takes it to their door' },
                  { id: 'parcel', name: 'Parcel', note: 'Rider drops at a courier counter' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setError(null); }}
                    className={`text-left px-4 py-3 rounded-xl border transition-all ${mode === m.id
                      ? 'border-[#3D8593] bg-[#3D8593]/10'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
                  >
                    <span className={`block text-[12.5px] font-black ${mode === m.id ? 'text-[#276a76]' : 'text-gray-700'}`}>{m.name}</span>
                    <span className="block text-[11px] font-medium text-gray-400 mt-0.5">{m.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Customer</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={input} placeholder="Jane Wanjiru" />
              </div>
              <div>
                <label className={lbl}>Their phone</label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={input} placeholder="0712 345678" />
              </div>
            </div>

            <div>
              <label className={lbl}>What's being delivered</label>
              <input value={item} onChange={e => setItem(e.target.value)} className={input} placeholder="Pegboard 90x30 White + container" />
            </div>

            {mode === 'doorstep' && (
              <div>
                <label className={lbl}>
                  Their pin <span className="text-neutral-300 normal-case font-medium">— paste the Google Maps link they sent, or "lat, lng"</span>
                </label>
                <input value={pin} onChange={e => setPin(e.target.value)} className={input} placeholder="https://maps.app.goo.gl/… or -1.2854, 36.8266" />
                {pin && resolving && (
                  <p className="text-[11px] font-bold text-gray-400 mt-1.5">Opening that link…</p>
                )}
                {pin && !coords && !resolving && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1.5">
                    No location in that. Shortened links only resolve on the live site — locally, open it and paste the full URL.
                  </p>
                )}
                {coords && (
                  <p className="text-[11px] font-bold text-emerald-600 mt-1.5">
                    Found {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {/* A pin reaches the gate. These reach the door. The customer fills
                these in themselves when they book — this is for the jobs you
                create by hand, off a phone call. */}
            {mode === 'doorstep' && (
              <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Finding the door <span className="normal-case font-medium text-gray-300">— optional, saves the rider a phone call</span>
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Estate / apartment</label>
                    <input value={dropBuilding} onChange={e => setDropBuilding(e.target.value)} className={input}
                      placeholder="Kileleshwa Heights" />
                  </div>
                  <div>
                    <label className={lbl}>House / unit number</label>
                    <input value={dropUnit} onChange={e => setDropUnit(e.target.value)} className={input}
                      placeholder="B12" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Which gate</label>
                  <input value={dropGate} onChange={e => setDropGate(e.target.value)} className={input}
                    placeholder="Main gate off Gatundu Road" />
                </div>
                <div>
                  <label className={lbl}>Anything else</label>
                  <input value={dropInstructions} onChange={e => setDropInstructions(e.target.value)} className={input}
                    placeholder="Ask for the caretaker, lift is on the left…" />
                </div>
              </div>
            )}

            {/* Parcel: no pin, no map. The rider goes to a counter in town —
                the receiver's address is the courier's problem, not ours. */}
            {mode === 'parcel' && (
              <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
                <div>
                  <label className={lbl}>
                    Courier <span className="text-neutral-300 normal-case font-medium">— whichever the customer chose</span>
                  </label>
                  <input value={courier} onChange={e => setCourier(e.target.value)} className={input}
                    placeholder="Easy Coach, Modern Coast, G4S…" />
                  <p className="text-[11px] font-medium text-gray-400 mt-1.5">
                    The customer pays the courier directly at the counter. The rider only records what they paid.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Receiver's name</label>
                    <input value={receiverName} onChange={e => setReceiverName(e.target.value)} className={input}
                      placeholder={customerName.trim() || 'Same as customer'} />
                  </div>
                  <div>
                    <label className={lbl}>Receiver's phone</label>
                    <input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className={input}
                      placeholder={customerPhone.trim() || 'Same as customer'} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Collecting in</label>
                  <input value={receiverDest} onChange={e => setReceiverDest(e.target.value)} className={input}
                    placeholder="Kisumu, Nakuru, Eldoret…" />
                </div>
                <div>
                  <label className={lbl}>Anything the rider should know</label>
                  <input value={parcelNotes} onChange={e => setParcelNotes(e.target.value)} className={input}
                    placeholder="Optional" />
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {mode === 'doorstep' && (
                <div>
                  <label className={lbl}>Area / landmark</label>
                  <input value={dropLabel} onChange={e => setDropLabel(e.target.value)} className={input} placeholder="Westlands, Rhapta Road" />
                </div>
              )}
              <div>
                <label className={lbl}>Rider collects from</label>
                <select value={originId} onChange={e => setOriginId(e.target.value)} className={input}>
                  {/* The dashboard names the actual place; the customer-facing
                      page deliberately does not. */}
                  {ORIGINS.map(o => <option key={o.id} value={o.id}>{o.name} — {o.adminDetail}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className={lbl}>Rider</label>
                <select value={riderId} onChange={e => setRiderId(e.target.value)} className={input}>
                  <option value="">— unassigned —</option>
                  {riders.filter(r => r.active).map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.isDefault ? ' (default)' : ''}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer pb-2.5">
                <input type="checkbox" checked={bulky} onChange={e => setBulky(e.target.checked)} className="w-4 h-4 accent-[#3D8593]" />
                {/* Jerrycan, not "27-inch monitor" — a yardstick everyone can
                    picture. Same wording the customer-facing page uses. */}
                <span className="text-[13px] font-bold text-gray-700">Bigger than a 20-litre jerrycan (+150)</span>
              </label>
            </div>

            <div className="bg-[#0f1a1c] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Rider fee</p>
                <p className="text-2xl font-black text-white tracking-tight">
                  {mode === 'doorstep' && measuring ? 'Measuring…' : quote ? money(quote.total) : '—'}
                </p>
              </div>
              {quote && (
                <p className="text-[11px] font-medium text-neutral-400 text-right">
                  {mode === 'parcel'
                    ? <>Flat drop at the counter<br />from {originById(originId).name}</>
                    : <>~{quote.km} km from {originById(originId).name}</>}
                  {mode === 'doorstep' && quote.atMinimum && <><br />Minimum fare applied</>}
                  {quote.surcharge > 0 && <><br />Bulky +{money(quote.surcharge)}</>}
                </p>
              )}
            </div>

            <button
              onClick={save}
              disabled={busy === 'new' || (mode === 'doorstep' ? !coords : !courier.trim())}
              className="w-full h-12 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40"
            >
              {busy === 'new' ? 'Creating…' : 'Create delivery'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        ) : !rows.length ? (
          <p className="text-sm text-gray-400 font-medium">
            No deliveries yet. Create one and send the customer their link.
            {' '}If you've just added this, run <code>add_deliveries.sql</code> first.
          </p>
        ) : rows.map(d => (
          <div key={d.id} className="p-4 rounded-2xl border border-neutral-100 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">
                  {d.customerName || 'Customer'}
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${statusChip(d.status)}`}>
                    {d.status === 'collected' ? 'Picked up' : d.status}
                  </span>
                  {d.parcelReceiptUrl && (
                    <a href={d.parcelReceiptUrl} target="_blank" rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100">
                      <Receipt size={9} weight="bold" className="inline mr-0.5" /> Receipt
                    </a>
                  )}
                </p>
                <p className="text-[11px] font-bold text-gray-500 mt-1">
                  {d.itemDescription || '—'}
                </p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  {d.dropLabel || 'Pinned'} · {d.distanceKm != null ? `~${d.distanceKm} km` : '—'} · {money(d.deliveryFeeKES)}
                  {d.parcelFeeKES != null && ` · courier ${money(d.parcelFeeKES)}`}
                </p>

                {/* The address detail the customer gave. Worth showing here so
                    you can read it out if the rider rings you from the gate. */}
                {(d.dropBuilding || d.dropUnit || d.dropGate) && (
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {[d.dropBuilding, d.dropUnit && `House ${d.dropUnit}`, d.dropGate]
                      .filter(Boolean).join(' · ')}
                  </p>
                )}

                {/* Where the rider says they are. Greyed once it is old enough
                    to be a stale promise rather than a live one. */}
                {d.status !== 'delivered' && etaLabel(d.riderEtaCode, d.riderEtaMinutes) && (
                  <p className={`text-[10.5px] font-black mt-1.5 flex items-center gap-1.5 ${
                    etaIsStale(d.riderEtaAt, now) ? 'text-gray-400' : 'text-[#3D8593]'
                  }`}>
                    <Motorcycle size={12} weight="fill" className="shrink-0" />
                    {etaLabel(d.riderEtaCode, d.riderEtaMinutes)}
                    <span className="font-bold text-gray-400">· {sinceLabel(d.riderEtaAt, now)}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <select
                  value={d.riderId || ''}
                  onChange={e => reassign(d, e.target.value)}
                  disabled={busy === d.id}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:border-[#3D8593]"
                >
                  <option value="">Unassigned</option>
                  {riders.filter(r => r.active || r.id === d.riderId).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => copyCustomerLink(d)}
                  className="px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#1eb955] text-[9px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-colors flex items-center gap-1.5"
                  title="Copy the customer's tracking link"
                >
                  {copied === d.id ? <><Check size={12} weight="bold" /> Copied</> : <><LinkSimple size={12} weight="bold" /> Customer link</>}
                </button>
                <button onClick={() => remove(d)} disabled={busy === d.id}
                  className="p-2 rounded-lg text-gray-300 hover:text-rose-500 transition-colors" title="Delete">
                  <Trash size={14} />
                </button>
              </div>
            </div>

            {d.riderNotes && (
              <p className="text-[11px] font-medium text-gray-500 mt-3 pt-3 border-t border-neutral-50 flex items-start gap-2">
                <Motorcycle size={13} weight="duotone" className="text-[#FF9900] shrink-0 mt-0.5" />
                {d.riderNotes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveriesPanel;
