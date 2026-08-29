import React, { useEffect, useMemo, useState } from 'react';
import {
  Truck, Plus, LinkSimple, Check, Trash, WarningCircle, Receipt, ArrowsClockwise, Motorcycle,
} from '@phosphor-icons/react';
import { Delivery, fetchDeliveries, createDelivery, deleteDelivery, updateDelivery } from '../services/deliveries';
import { Rider, fetchRiders } from '../services/riders';
import { ORIGINS, originById, quoteDelivery, estimatedRoadKm, fetchRoadKm } from '../utils/delivery';

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

const DeliveriesPanel: React.FC = () => {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  const load = () => {
    setLoading(true);
    Promise.all([fetchDeliveries(), fetchRiders()]).then(([d, r]) => {
      setRows(d); setRiders(r);
      const def = r.find(x => x.isDefault && x.active) || r.find(x => x.active);
      setRiderId(prev => prev || def?.id || '');
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

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

  const quote = km != null ? quoteDelivery(km, bulky) : null;

  const save = async () => {
    if (!coords) { setError('Paste the customer\'s pin — a Google Maps link or "lat, lng".'); return; }
    setBusy('new'); setError(null);
    const res = await createDelivery({
      riderId: riderId || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      itemDescription: item.trim() || undefined,
      originId,
      dropLat: coords.lat, dropLng: coords.lng,
      dropLabel: dropLabel.trim() || undefined,
      distanceKm: quote?.km,
      isBulky: bulky,
      deliveryFeeKES: quote?.total,
    });
    setBusy(null);
    if (!res.success) {
      setError(/relation|does not exist|schema cache/i.test(res.error || '')
        ? 'Run add_deliveries.sql in Supabase first — the table does not exist yet.'
        : res.error || 'Could not create that delivery.');
      return;
    }
    setCustomerName(''); setCustomerPhone(''); setItem(''); setPin(''); setDropLabel('');
    setBulky(false); setKm(null); setAdding(false);
    load();
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
    await updateDelivery(d.id, { riderId: newRiderId });
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

        {adding && (
          <div className="bg-neutral-50/60 border border-neutral-100 rounded-2xl p-5 space-y-4">
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

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Area / landmark</label>
                <input value={dropLabel} onChange={e => setDropLabel(e.target.value)} className={input} placeholder="Westlands, Rhapta Road" />
              </div>
              <div>
                <label className={lbl}>Rider collects from</label>
                <select value={originId} onChange={e => setOriginId(e.target.value)} className={input}>
                  {ORIGINS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
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
                <span className="text-[13px] font-bold text-gray-700">Bulky item (+150)</span>
              </label>
            </div>

            <div className="bg-[#0f1a1c] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Rider fee</p>
                <p className="text-2xl font-black text-white tracking-tight">
                  {measuring ? 'Measuring…' : quote ? money(quote.total) : '—'}
                </p>
              </div>
              {quote && (
                <p className="text-[11px] font-medium text-neutral-400 text-right">
                  ~{quote.km} km from {originById(originId).name}
                  {quote.atMinimum && <><br />Minimum fare applied</>}
                  {quote.surcharge > 0 && <><br />Bulky +{money(quote.surcharge)}</>}
                </p>
              )}
            </div>

            <button
              onClick={save}
              disabled={busy === 'new' || !coords}
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
