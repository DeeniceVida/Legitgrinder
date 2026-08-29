import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Package, WhatsappLogo, CircleNotch, Crosshair, Info } from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';
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

const DeliveryEstimator: React.FC = () => {
  const [originId, setOriginId] = useState<'cbd' | 'industrial'>('cbd');
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

  const money = (n: number) => `KES ${n.toLocaleString()}`;

  return (
    <div className="bg-white rounded-[1.75rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 md:px-8 pt-7 pb-5">
        <p className="eyebrow text-[#3D8593] mb-3">Delivery</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-2">
          What will the rider cost?
        </h2>
        <p className="text-gray-500 font-light text-sm leading-relaxed">
          Drop a pin where you want it delivered and see the fee before you message anyone.
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
            <span className="block text-[13px] font-bold text-gray-900">Large or bulky item</span>
            <span className="block text-[11px] font-medium text-gray-400">
              Won't sit on a boda comfortably — adds {money(BULKY_SURCHARGE)}.
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

                <button
                  onClick={askOnWhatsApp}
                  className="w-full mt-5 h-[54px] bg-[#25D366] text-white rounded-full font-black uppercase text-[11px] tracking-[0.2em] hover:bg-[#128C7E] transition-all flex items-center justify-center gap-3"
                >
                  <WhatsappLogo size={18} weight="fill" /> Book this delivery
                </button>
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
