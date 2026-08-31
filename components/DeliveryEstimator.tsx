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
/** Coordinates out of whatever was pasted, when they are already in the text. */
const parsePastedLatLng = (raw: string): { lat: number; lng: number } | null => {
  // Order matters. !3d/!4d is the PLACE pin; @lat,lng is only the map's
  // viewport centre — on a real link the two sit ~280m apart, and taking @
  // first would quietly bake that error into the fee.
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
  /**
   * The owner's calls, arriving in the link — not the customer's to make.
   * The package sits in ONE place, and only he has seen how big it is.
   */
  origin?: 'cbd' | 'industrial';
  large?: boolean;
}

const DeliveryEstimator: React.FC<Props> = ({ reference, item, origin: originProp, large }) => {
  const originId = originProp || 'cbd';
  const bulky = large === true;
  /** Doorstep or as far as a courier's counter. The first thing we ask. */
  const [mode, setMode] = useState<'doorstep' | 'parcel' | null>(null);
  const [courier, setCourier] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverDest, setReceiverDest] = useState('');
  const [parcelNotes, setParcelNotes] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Set once it's booked — their own link to watch it. */
  const [bookedToken, setBookedToken] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [routed, setRouted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outOfArea, setOutOfArea] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  /** A Google Maps link or raw coordinates, pasted instead of tapping. */
  const [pasted, setPasted] = useState('');
  const [resolvingPin, setResolvingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

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
    // Depends on `mode` because the map container is only rendered once a
    // delivery type is chosen. With an empty dependency list this ran on mount,
    // found no container, and never ran again — no map ever appeared.
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /**
   * A pasted location. Raw coordinates and full maps URLs are read here; a
   * shortened maps.app.goo.gl link has to be followed server-side because the
   * browser can't, and that short form is exactly what Google's Share gives.
   */
  useEffect(() => {
    const raw = pasted.trim();
    setPinError(null);
    if (!raw) { setResolvingPin(false); return; }

    const local = parsePastedLatLng(raw);
    if (local) {
      setDrop(local);
      mapRef.current?.setView([local.lat, local.lng], 15);
      setResolvingPin(false);
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      setPinError('Paste the whole link, or coordinates like -1.2854, 36.8266.');
      return;
    }

    let dead = false;
    setResolvingPin(true);
    // Wait for them to finish pasting before hitting the server.
    const t = setTimeout(() => {
      fetch('/api/resolve-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: raw }),
      })
        .then(r => r.json())
        .then(d => {
          if (dead) return;
          if (d?.success) {
            setDrop({ lat: d.lat, lng: d.lng });
            mapRef.current?.setView([d.lat, d.lng], 15);
          } else {
            setPinError(d?.error || 'We could not read a location from that link.');
          }
        })
        .catch(() => { if (!dead) setPinError('We could not open that link. Tap the map instead.'); })
        .finally(() => { if (!dead) setResolvingPin(false); });
    }, 600);
    return () => { dead = true; clearTimeout(t); };
  }, [pasted]);

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
    if (!shownQuote) return;
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
  /** Book it: creates the job, puts it on the rider's phone, tells the owner. */
  const submit = async () => {
    if (!mode || !shownQuote) return;
    if (mode === 'doorstep' && !drop) return;
    if (!name.trim()) { setFormError('We need a name for the delivery.'); return; }
    if (phone.trim().replace(/\D/g, '').length < 9) { setFormError('A phone number the rider can call, please.'); return; }
    if (mode === 'parcel') {
      // Exactly what the courier will ask for at the counter.
      if (!courier.trim()) { setFormError('Which courier are you sending it with?'); return; }
      if (!receiverName.trim()) { setFormError('Who is receiving it? The courier needs a name.'); return; }
      if (receiverPhone.trim().replace(/\D/g, '').length < 9) { setFormError('The courier needs a phone number for the receiver.'); return; }
      if (!receiverDest.trim()) { setFormError('Which town is it going to?'); return; }
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('That email address does not look right.'); return;
    }
    setFormError(null);
    setSending(true);

    const res = await requestDelivery({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim() || undefined,
      item,
      originId,
      deliveryType: mode,
      courierName: mode === 'parcel' ? courier.trim() : undefined,
      receiverName: mode === 'parcel' ? receiverName.trim() : undefined,
      receiverPhone: mode === 'parcel' ? receiverPhone.trim() : undefined,
      receiverDestination: mode === 'parcel' ? receiverDest.trim() : undefined,
      parcelNotes: mode === 'parcel' ? (parcelNotes.trim() || undefined) : undefined,
      lat: drop?.lat, lng: drop?.lng,
      label: drop ? `${drop.lat.toFixed(5)}, ${drop.lng.toFixed(5)}` : undefined,
      km: shownQuote.km,
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
        deliveryType: mode,
        courierName: mode === 'parcel' ? courier.trim() : undefined,
        mapUrl: drop ? `https://www.google.com/maps?q=${drop.lat.toFixed(6)},${drop.lng.toFixed(6)}` : undefined,
        receiverName: mode === 'parcel' ? receiverName.trim() : undefined,
        receiverDestination: mode === 'parcel' ? receiverDest.trim() : undefined,
        km: shownQuote.km,
        bulky,
        feeKES: res.deliveryFeeKES ?? shownQuote.total,
        assigned: res.assigned,
        trackUrl: `${window.location.origin}/delivery/${res.customerToken}`,
      }),
    }).catch(() => {});

    setSending(false);
    setBookedToken(res.customerToken || null);
  };

  const money = (n: number) => `KES ${n.toLocaleString()}`;
  /**
   * A parcel is a flat drop-off at a counter in town — every courier office
   * falls inside the minimum fare from either pickup point, so measuring a
   * route would produce the same number with extra steps and a wrong pin
   * would produce a wrong one. The server prices it identically.
   */
  const shownQuote = mode === 'parcel' ? quoteDelivery(0, bulky) : quote;

  const plain = 'w-full h-[50px] bg-neutral-50 border border-gray-200 rounded-2xl px-4 text-sm font-medium outline-none focus:border-[#FF9900] transition-colors';

  /* Booked — nothing else on this page matters now. */
  if (bookedToken) {
    return (
      <div className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm p-8 text-center">
        <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
          <Check size={26} weight="bold" />
        </span>
        <h2 className="text-2xl font-bold tracking-tighter mb-2">A rider is on it.</h2>
        <p className="text-gray-500 font-light text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          {mode === 'parcel' ? (
            <>
              Your parcel is going to <strong className="text-gray-900">{courier.trim()}</strong>. Keep this link —
              the rider uploads the receipt to it once your parcel is booked in
              {email.trim() ? ', and we will email you a copy' : ''}.
            </>
          ) : (
            <>Keep this link — it shows you where your item has got to, right up to the door.</>
          )}
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

  const field = 'w-full h-[50px] bg-white/10 border border-white/20 rounded-2xl px-4 text-sm font-medium text-white outline-none focus:border-[#3D8593] placeholder:text-neutral-500';

  return (
    <div className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 md:px-8 pt-7 pb-5">
        <p className="eyebrow text-[#3D8593] mb-3">Delivery</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">
          Where should we bring it?
        </h2>
        <p className="text-gray-500 font-light text-sm leading-relaxed">
          KES {RATE_PER_KM} per kilometre from where your item is, minimum {money(MINIMUM_FEE)}.
          You see the fee before you confirm anything.
        </p>
      </div>

      {/* THE FIRST QUESTION. Everything after it differs, so it is asked before
          the map rather than after. */}
      <div className="px-6 md:px-8 pb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">How do you want it?</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <button
            onClick={() => { setMode('doorstep'); setDrop(null); }}
            aria-pressed={mode === 'doorstep'}
            className={`text-left px-4 py-4 rounded-2xl border transition-all ${mode === 'doorstep'
              ? 'border-[#3D8593] bg-[#3D8593]/5'
              : 'border-gray-200 bg-white hover:border-[#3D8593]/50'}`}
          >
            <span className={`block text-[13px] font-black ${mode === 'doorstep' ? 'text-[#3D8593]' : 'text-gray-900'}`}>
              To my door
            </span>
            <span className="block text-[11px] font-medium text-gray-400 mt-0.5 leading-snug">
              Anywhere in Nairobi
            </span>
          </button>
          <button
            onClick={() => { setMode('parcel'); setDrop(null); }}
            aria-pressed={mode === 'parcel'}
            className={`text-left px-4 py-4 rounded-2xl border transition-all ${mode === 'parcel'
              ? 'border-[#FF9900] bg-[#FF9900]/5'
              : 'border-gray-200 bg-white hover:border-[#FF9900]/50'}`}
          >
            <span className={`block text-[13px] font-black ${mode === 'parcel' ? 'text-[#FF9900]' : 'text-gray-900'}`}>
              To a courier
            </span>
            <span className="block text-[11px] font-medium text-gray-400 mt-0.5 leading-snug">
              I am outside Nairobi
            </span>
          </button>
        </div>
      </div>

      {/* A parcel needs no map. The rider goes to a counter in town, and what
          matters is what the COURIER will ask for in order to book it. */}
      {mode === 'parcel' && (
        <div className="px-6 md:px-8 pb-4 space-y-4">
          <div>
            <label htmlFor="courier" className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
              Which courier?
            </label>
            <input
              id="courier"
              value={courier}
              onChange={e => setCourier(e.target.value)}
              placeholder="e.g. Wells Fargo, Easy Coach"
              className={plain}
            />
            <p className="text-[11px] font-medium text-gray-400 mt-1.5">
              Your choice entirely — we do not pick for you.
            </p>
          </div>

          {/* Two people are involved and the form used to ask for a name and a
              phone twice without saying whose. Each block now names its person
              before asking anything. */}
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-[13px] font-black text-gray-900 mb-0.5">1 · You, the sender</p>
            <p className="text-[11px] font-medium text-gray-400 mb-2.5">
              So we can reach you about this parcel. Your receipt goes to your email.
            </p>
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" className={plain} />
              <input value={phone} onChange={e => setPhone(e.target.value)}
                inputMode="tel" placeholder="Your phone" className={plain} />
              <input value={email} onChange={e => setEmail(e.target.value)}
                inputMode="email" type="email" placeholder="Your email — where the receipt goes" className={plain} />
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <p className="text-[13px] font-black text-gray-900 mb-0.5">2 · Who collects it upcountry</p>
            <p className="text-[11px] font-medium text-gray-400 mb-2.5">
              Exactly as {courier.trim() || 'the courier'} will write it on the waybill.
            </p>
            <div className="space-y-2">
              <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
                placeholder="Receiver's full name" className={plain} />
              <input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)}
                inputMode="tel" placeholder="Receiver's phone" className={plain} />
              <input value={receiverDest} onChange={e => setReceiverDest(e.target.value)}
                placeholder="Town it is going to — e.g. Nakuru, Kisumu" className={plain} />
              <textarea value={parcelNotes} onChange={e => setParcelNotes(e.target.value)}
                rows={2} placeholder="Anything else the courier should know (optional)"
                className={plain + ' h-auto py-3 resize-none'} />
            </div>
            <p className="text-[11px] font-medium text-gray-400 mt-2">
              Sending it to yourself? Put your own name and phone here too.
            </p>
          </div>
        </div>
      )}

      {mode && (
        <>
          {/* Map — DOORSTEP ONLY. A parcel is dropped at a counter in town, so
              a pin would be asking for a location nobody travels to. */}
          {mode === 'doorstep' && (
          <div className="px-6 md:px-8">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {mode === 'parcel' ? 'Tap where the courier office is' : 'Tap the map to drop your pin'}
              </p>
              {mode === 'doorstep' && (
                <button
                  onClick={useMyLocation}
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#3D8593] hover:underline"
                >
                  <Crosshair size={13} weight="bold" /> Use my location
                </button>
              )}
            </div>
            <div
              ref={mapEl}
              className="w-full h-[300px] md:h-[380px] rounded-2xl overflow-hidden border border-gray-200 z-0"
            />

            {/* Most people don't tap a map — they share their location from
                Google Maps and paste the link. Shortened maps.app.goo.gl links
                carry no coordinates until they're followed, which a browser
                can't do, so the server follows it. */}
            <div className="mt-3">
              <label htmlFor="paste-pin" className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                Or paste a Google Maps link
              </label>
              <input
                id="paste-pin"
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                className="w-full h-[50px] bg-neutral-50 border border-gray-200 rounded-2xl px-4 text-sm font-medium outline-none focus:border-[#3D8593] transition-colors"
              />
              {pasted.trim() && (
                <p className={`text-[11px] font-bold mt-1.5 ${
                  resolvingPin ? 'text-gray-400' : pinError ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {resolvingPin
                    ? 'Opening that link…'
                    : pinError
                      ? pinError
                      : 'Found it — check the orange pin on the map above.'}
                </p>
              )}
              {!pasted.trim() && (
                <p className="text-[11px] font-medium text-gray-400 mt-1.5">
                  In Google Maps: hold your spot → Share → Copy link → paste it here.
                </p>
              )}
            </div>
          </div>
          )}

          {/* Quote */}
          <div className="px-6 md:px-8 py-6 space-y-4">
            {mode === 'doorstep' && !drop ? (
              <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-2xl p-5">
                <MapPin size={20} weight="duotone" className="text-gray-300 shrink-0" />
                <p className="text-[13px] font-medium text-gray-400">
                  Drop a pin above to see your fee.
                </p>
              </div>
            ) : (
              <div className="bg-[#0f1a1c] rounded-2xl p-6 text-white">
                {busy || !shownQuote ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <CircleNotch size={16} className="animate-spin" /> Measuring the route…
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                      {mode === 'parcel' ? 'Drop-off at the courier' : 'The rider fee'}
                    </p>

                    {/* Itemised, so the large-item charge is explained rather
                        than appearing as a number nobody asked for. */}
                    <div className="space-y-2 text-[13px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-neutral-400">
                          {mode === 'parcel'
                            ? <>Ride from {origin.name} to {courier.trim() || 'the courier'}</>
                            : <>{shownQuote.km} km from {origin.name}{shownQuote.atMinimum && <span className="text-neutral-500"> · minimum fare</span>}</>}
                        </span>
                        <span className="font-bold tabular-nums">{money(shownQuote.distanceFee)}</span>
                      </div>
                      {bulky && (
                        <div className="flex justify-between gap-4">
                          <span className="text-[#FF9900]">
                            Large item
                            <span className="block text-[11px] text-neutral-500 leading-snug">
                              Yours is bigger than a 20-litre jerrycan
                            </span>
                          </span>
                          <span className="font-bold tabular-nums text-[#FF9900]">+{money(shownQuote.surcharge)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 pt-3 border-t border-white/15">
                        <span className="font-black">Total</span>
                        <span className="text-2xl font-black tracking-tight tabular-nums">{money(shownQuote.total)}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        {mode === 'parcel'
                          ? 'We will confirm this with you before the rider sets off.'
                          : 'Paid to the rider on arrival.'}
                      </p>
                    </div>

                    {mode === 'parcel' && (
                      <div className="mt-4 bg-[#FF9900]/10 border border-[#FF9900]/25 rounded-2xl p-4">
                        <p className="text-[12px] text-[#FFCB80] leading-relaxed">
                          <strong className="text-[#FF9900]">{courier.trim() || 'The courier'}'s own charge is separate</strong> and
                          is settled with them directly — whatever they charge is what is paid, and it is not
                          part of the fee above. The rider photographs the receipt so you have a copy of it.
                        </p>
                      </div>
                    )}

                    {outOfArea && (
                      <p className="mt-4 text-[12px] font-medium text-[#FF9900] leading-relaxed">
                        That pin is outside Nairobi — we will need to confirm whether a rider can reach it.
                      </p>
                    )}

                    <div className="mt-5 space-y-2">
                      {/* A parcel already collected these above, under a
                          heading that says whose they are. Asking again here
                          is what made two names and two phones confusing. */}
                      {mode === 'doorstep' && (
                        <>
                          <input
                            value={name} onChange={e => setName(e.target.value)}
                            placeholder="Your name" className={field}
                          />
                          <input
                            value={phone} onChange={e => setPhone(e.target.value)}
                            inputMode="tel" placeholder="Phone the rider should call" className={field}
                          />
                          <input
                            value={email} onChange={e => setEmail(e.target.value)}
                            inputMode="email" type="email" placeholder="Email (optional)" className={field}
                          />
                        </>
                      )}
                      {formError && <p className="text-[12px] font-bold text-rose-400">{formError}</p>}
                      <button
                        onClick={submit}
                        disabled={sending}
                        className="w-full h-[54px] bg-[#FF9900] text-white rounded-full font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white hover:text-[#0f1a1c] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {sending
                          ? <><CircleNotch size={16} className="animate-spin" /> Sending…</>
                          : <>Send this to a rider</>}
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
                long way round can move it.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveryEstimator;
