import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, WhatsappLogo, CircleNotch, Crosshair, Info, Check } from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';
import { requestDelivery } from '../services/deliveries';
import {
  ORIGINS, originById, fetchRoadKm, quoteDelivery, isNearNairobi,
  RATE_PER_KM, MINIMUM_FEE, BULKY_SURCHARGE, Quote,
} from '../utils/delivery';

/**
 * "What will the rider cost me?" — answered before anyone has to ask.
 *
 * The site used to say the rider's fee is agreed between the customer and the
 * rider, which is a cost with no number attached and a negotiation with a
 * stranger. Drop a pin, get a figure.
 *
 * The figure is explicitly an ESTIMATE confirmed when a rider is assigned, so
 * a long way round or a closed road is corrected before anyone commits.
 */

// Leaflet ships its marker icons as separate files that bundlers rewrite the
// paths of. Drawing our own avoids the broken-image problem entirely.
const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#FF9900;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});
const originIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3D8593;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Props {
  /** Order code this delivery belongs to, when the link carried one. */
  reference?: string;
  /** What is being delivered, when we already know. */
  item?: string;
}

const DeliveryEstimator: React.FC<Props> = ({ reference, item }) => {
  const [originId, setOriginId] = useState<'cbd' | 'industrial'>('cbd');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Set once it's booked — their own link to watch it. */
  const [bookedToken, setBookedToken] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ lat: number; lng: number } | null>(null);
  const [bulky, setBulky] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [routed, setRouted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const dropMarker = useRef<L.Marker | null>(null);
  const originMarker = useRef<L.Marker | null>(null);

  const origin = originById(originId);

  // --- map ---------------------------------------------------------------
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { attributionControl: true })
      .setView([origin.lat, origin.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      setDrop({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    setMapReady(true);
    // The pane is often laid out after the map mounts; without this the tiles
    // render into a zero-height box and the map looks broken.
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
      // The markers belonged to the map just destroyed. Leaving the refs set
      // makes the next mount take the "already exists, just move it" path and
      // silently attach nothing — which is why the origin pin never appeared.
      originMarker.current = null;
      dropMarker.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the origin marker on whichever pickup point is selected.
  //
  // This must wait for the map to exist. Depending on originId alone, it ran
  // once before the map was built, bailed out, and never ran again — so the
  // teal "rider starts here" pin was simply never drawn.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!originMarker.current) {
      originMarker.current = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);
    } else {
      originMarker.current.setLatLng([origin.lat, origin.lng]);
    }
    originMarker.current.bindTooltip(`Rider starts here — ${origin.name}`);
  }, [originId, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drop) return;
    if (!dropMarker.current) {
      dropMarker.current = L.marker([drop.lat, drop.lng], { icon: pinIcon, draggable: true }).addTo(map);
      dropMarker.current.on('dragend', () => {
        const p = dropMarker.current!.getLatLng();
        setDrop({ lat: p.lat, lng: p.lng });
      });
    } else {
      dropMarker.current.setLatLng([drop.lat, drop.lng]);
    }
  }, [drop]);

  // --- quote -------------------------------------------------------------
  useEffect(() => {
    if (!drop) { setQuote(null); return; }
    setOutOfArea(!isNearNairobi(drop));
    let cancelled = false;
    setBusy(true);
    fetchRoadKm({ lat: origin.lat, lng: origin.lng }, drop).then(({ km, routed }) => {
      if (cancelled) return;
      setQuote(quoteDelivery(km, bulky));
      setRouted(routed);
      setBusy(false);
    });
    return () => { cancelled = true; };
  }, [drop, originId, bulky]); // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDrop(p);
        mapRef.current?.setView([p.lat, p.lng], 15);
      },
      () => { /* denied — the map still works */ },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const askOnWhatsApp = () => {
    if (!drop || !quote) return;
    const mapLink = `https://www.google.com/maps?q=${drop.lat.toFixed(6)},${drop.lng.toFixed(6)}`;
    const msg = encodeURIComponent(
      `Hi LegitGrinder, I'd like delivery.\n\n` +
      `From: ${origin.name}\n` +
      `To: ${mapLink}\n` +
      `Distance: ~${quote.km} km\n` +
      `${bulky ? 'Large / bulky item\n' : ''}` +
      `Estimated rider fee: KES ${quote.total.toLocaleString()}\n\n` +
      `Please confirm.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  /** Book it: creates the job, puts it on the rider's phone, tells the owner. */
  const submit = async () => {
    if (!drop || !quote) return;
    if (!name.trim()) { setFormError('We need a name for the delivery.'); return; }
    if (phone.trim().replace(/\D/g, '').length < 9) { setFormError('A phone number the rider can call, please.'); return; }
    setFormError(null);
    setSending(true);

    const res = await requestDelivery({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      item,
      originId,
      lat: drop.lat, lng: drop.lng,
      label: `${drop.lat.toFixed(5)}, ${drop.lng.toFixed(5)}`,
      km: quote.km,
      bulky,
      reference,
    });

    if (!res.ok) { setSending(false); setFormError(res.error || 'We could not book that.'); return; }

    // Tell the owner. Best-effort — the job already exists either way, and a
    // failed email must never look to the customer like a failed booking.
    fetch('/api/delivery-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        item, reference,
        origin: origin.name,
        mapUrl: `https://www.google.com/maps?q=${drop.lat.toFixed(6)},${drop.lng.toFixed(6)}`,
        km: quote.km,
        bulky,
        feeKES: res.deliveryFeeKES ?? quote.total,
        assigned: res.assigned,
        trackUrl: `${window.location.origin}/delivery/${res.customerToken}`,
      }),
    }).catch(() => {});

    setSending(false);
    setBookedToken(res.customerToken || null);
  };

  const money = (n: number) => `KES ${n.toLocaleString()}`;

  /* Booked — nothing else on this page matters now. */
  if (bookedToken) {
    return (
      <div className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-8 text-center">
        <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
          <Check size={26} weight="bold" />
        </span>
        <h2 className="text-2xl font-bold tracking-tighter mb-2">A rider is on it.</h2>
        <p className="text-gray-500 font-light text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          Your delivery has been sent to a rider and to LegitGrinder. Keep this link — it
          shows you where your item has got to, and carries the courier receipt if we send
          it onward.
        </p>
        <a
          href={`/delivery/${bookedToken}`}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#0f1a1c] text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#3D8593] transition-colors"
        >
          Track my delivery
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 md:px-8 pt-7 pb-5">
        <p className="eyebrow text-[#3D8593] mb-3">Delivery</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">
          Where should we bring it?
        </h2>
        <p className="text-gray-500 font-light text-sm leading-relaxed">
          Drop a pin where you want it delivered. You see the fee before you confirm anything —
          KES {RATE_PER_KM} per kilometre, minimum {money(MINIMUM_FEE)}.
        </p>
      </div>

      {/* Pickup point */}
      <div className="px-6 md:px-8 pb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Rider collects from</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {ORIGINS.map(o => (
            <button
              key={o.id}
              onClick={() => setOriginId(o.id)}
              aria-pressed={originId === o.id}
              className={`text-left px-4 py-3 rounded-2xl border transition-all ${originId === o.id
                ? 'border-[#3D8593] bg-[#3D8593]/5'
                : 'border-gray-200 bg-white hover:border-[#3D8593]/50'}`}
            >
              <span className={`block text-[13px] font-black ${originId === o.id ? 'text-[#3D8593]' : 'text-gray-900'}`}>{o.name}</span>
              <span className="block text-[11px] font-medium text-gray-400 mt-0.5 leading-snug">{o.detail}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="px-6 md:px-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tap the map to drop your pin</p>
          <button
            onClick={useMyLocation}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#3D8593] hover:underline"
          >
            <Crosshair size={13} weight="bold" /> Use my location
          </button>
        </div>
        <div
          ref={mapEl}
          className="w-full h-[300px] md:h-[380px] rounded-2xl overflow-hidden border border-gray-200 z-0"
        />
      </div>

      {/* Options + quote */}
      <div className="px-6 md:px-8 py-6 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={bulky}
            onChange={e => setBulky(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#3D8593]"
          />
          <span>
            <span className="block text-[13px] font-bold text-gray-900">Is it bigger than a 27-inch monitor?</span>
            <span className="block text-[11px] font-medium text-gray-400">
              Anything larger than that needs more than a backpack — adds {money(BULKY_SURCHARGE)}.
            </span>
          </span>
        </label>

        {!drop ? (
          <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-2xl p-5">
            <MapPin size={20} weight="duotone" className="text-gray-300 shrink-0" />
            <p className="text-[13px] font-medium text-gray-400">
              Drop a pin above to see your fee.
            </p>
          </div>
        ) : (
          <div className="bg-[#0f1a1c] rounded-2xl p-6 text-white">
            {busy || !quote ? (
              <p className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <CircleNotch size={16} className="animate-spin" /> Measuring the route…
              </p>
            ) : (
              <>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Estimated rider fee</p>
                    <p className="text-4xl font-black tracking-tight">{money(quote.total)}</p>
                  </div>
                  <div className="text-right text-[11px] font-medium text-neutral-400 leading-relaxed">
                    <p>~{quote.km} km {routed ? 'by road' : '(approx.)'}</p>
                    {/* Never print an equation that doesn't hold: the fee is
                        rounded up to the nearest 10, so "7 × 50 = 360" would be
                        visibly wrong arithmetic on the customer's screen. */}
                    <p>
                      {quote.atMinimum
                        ? `Minimum fare ${money(MINIMUM_FEE)}`
                        : `${quote.km} km × ${money(RATE_PER_KM)} → ${money(quote.distanceFee)}`}
                    </p>
                    {quote.surcharge > 0 && <p>Bulky item + {money(quote.surcharge)}</p>}
                  </div>
                </div>

                {outOfArea && (
                  <p className="mt-4 text-[12px] font-medium text-[#FF9900] leading-relaxed">
                    That pin is outside Nairobi — we'll need to confirm whether a rider can reach it.
                  </p>
                )}

                {/* Who it's for. Asked only once a fee exists, so nobody fills
                    in a form before knowing what it costs. */}
                <div className="mt-5 space-y-2">
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-[50px] bg-white/10 border border-white/20 rounded-2xl px-4 text-sm font-medium text-white outline-none focus:border-[#3D8593] placeholder:text-neutral-500"
                  />
                  <input
                    value={phone} onChange={e => setPhone(e.target.value)}
                    inputMode="tel" placeholder="Phone the rider should call"
                    className="w-full h-[50px] bg-white/10 border border-white/20 rounded-2xl px-4 text-sm font-medium text-white outline-none focus:border-[#3D8593] placeholder:text-neutral-500"
                  />
                  {formError && <p className="text-[12px] font-bold text-rose-400">{formError}</p>}
                  <button
                    onClick={submit}
                    disabled={sending}
                    className="w-full h-[54px] bg-[#FF9900] text-white rounded-full font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white hover:text-[#0f1a1c] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {sending ? <><CircleNotch size={16} className="animate-spin" /> Sending…</> : <>Send this to a rider</>}
                  </button>
                  <button
                    onClick={askOnWhatsApp}
                    className="w-full h-[46px] border border-white/20 text-neutral-300 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:border-[#25D366] hover:text-[#25D366] transition-all flex items-center justify-center gap-2"
                  >
                    <WhatsappLogo size={16} weight="fill" /> Or ask on WhatsApp
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <Info size={16} weight="duotone" className="text-[#FF9900] shrink-0 mt-0.5" />
          <p className="text-[11.5px] font-medium text-amber-900/80 leading-relaxed">
            This is an <strong>estimate</strong>, confirmed when we assign a rider — a closed road or a
            long way round can move it. Sending your parcel onward by courier (Wells Fargo, a matatu
            service) is charged separately <strong>at cost</strong>, and you get the receipt.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryEstimator;
