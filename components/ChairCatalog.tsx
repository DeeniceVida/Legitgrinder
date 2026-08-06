import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Lock, Cube, Package, WarningCircle, ArrowRight } from '@phosphor-icons/react';
import {
  ChairModel, ChairSettings, HandlingBand, ChairColor,
  fetchChairModels, fetchChairSettings, fetchHandlingBands,
  priceChair, handlingFee, containerQty, chairFeatures, defaultColor, money,
  DEFAULT_CHAIR_SETTINGS,
} from '../services/chairs';

/** One configured line, in the shape the quote form submits. */
export interface ChairLine {
  modelId: string;
  modelCode: string;
  name: string;
  color: string;
  qty: number;
  unitKES: number | null;
  goodsKES: number;
  shippingKES: number;
}

export interface ChairOrder {
  lines: ChairLine[];
  goodsKES: number;
  shippingKES: number;
  handlingKES: number;
  totalKES: number;
  /** True when every line could be priced — false while the freight rate is unset. */
  priced: boolean;
}

interface Props {
  /** Prices stay hidden until the buyer has told us who they are. */
  identified: boolean;
  onUnlock: () => void;
  onChange: (order: ChairOrder) => void;
  /** How many models loaded. Zero before the migration has been run, which is
   *  the page's cue to drop the section heading too rather than leave a
   *  headline standing over nothing. */
  onReady: (count: number) => void;
}

const SWATCH: Record<string, string> = {
  Black: '#1c1c1e', Grey: '#8b9096', Red: '#a83232', Pink: '#dc8bab',
};

const ChairCatalog: React.FC<Props> = ({ identified, onUnlock, onChange, onReady }) => {
  const [models, setModels] = useState<ChairModel[]>([]);
  const [settings, setSettings] = useState<ChairSettings>(DEFAULT_CHAIR_SETTINGS);
  const [bands, setBands] = useState<HandlingBand[]>([]);
  const [loaded, setLoaded] = useState(false);

  /** modelId -> chosen colour id */
  const [colorFor, setColorFor] = useState<Record<string, string>>({});
  /** modelId -> quantity */
  const [qtyFor, setQtyFor] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([fetchChairModels(), fetchChairSettings(), fetchHandlingBands()])
      .then(([m, s, b]) => { setModels(m); setSettings(s); setBands(b); onReady(m.length); })
      .catch(() => onReady(0))
      .finally(() => setLoaded(true));
  }, []);

  const pickedColor = (m: ChairModel): ChairColor | undefined =>
    m.colors.find(c => c.id === colorFor[m.id]) || defaultColor(m);

  const order = useMemo<ChairOrder>(() => {
    const lines: ChairLine[] = [];
    let goods = 0, shipping = 0, priced = true;

    models.forEach(m => {
      const qty = qtyFor[m.id] || 0;
      if (qty <= 0) return;
      const color = pickedColor(m);
      const p = priceChair(m, settings, qty, color);
      if (p.unitKES == null) priced = false;
      goods += p.parts.goodsKES * qty;
      shipping += p.parts.shippingKES * qty;
      lines.push({
        modelId: m.id, modelCode: m.modelCode, name: m.name,
        color: color?.label || '—', qty,
        unitKES: p.unitKES, goodsKES: p.parts.goodsKES, shippingKES: p.parts.shippingKES,
      });
    });

    const handling = priced ? handlingFee(goods, bands) : 0;
    return {
      lines, goodsKES: goods, shippingKES: shipping, handlingKES: handling,
      totalKES: goods + shipping + handling, priced: priced && lines.length > 0,
    };
  }, [models, settings, bands, qtyFor, colorFor]);

  useEffect(() => { onChange(order); }, [order]);

  const setQty = (id: string, n: number) =>
    setQtyFor(q => ({ ...q, [id]: Math.max(0, Math.min(9999, n)) }));

  // Nothing to show before the migration has been run — the page simply carries
  // on without a catalogue rather than rendering an empty shell.
  if (!loaded || !models.length) return null;

  const showPrices = identified;
  const rateSet = settings.kesPerCbm != null;

  return (
    <div>
      {/* Gate notice — specs are public, prices are not */}
      {!showPrices && (
        <div className="flex items-start gap-3.5 rounded-xl border border-[#3D8593]/40 bg-[#3D8593]/10 p-5 mb-6">
          <Lock size={18} weight="duotone" className="text-[#7fc2ce] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm text-white/75 font-light leading-relaxed">
              Specifications, carton volumes and minimums are open to everyone. Volume pricing is for
              buyers we can quote — tell us who you are and every figure below unlocks.
            </p>
            <button
              onClick={onUnlock}
              className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:text-white transition-colors"
            >
              Unlock volume pricing <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Freight rate not set — say so plainly rather than quote a made-up figure */}
      {showPrices && !rateSet && (
        <div className="flex items-start gap-3.5 rounded-xl border border-[#FF9900]/30 bg-[#FF9900]/10 p-5 mb-6">
          <WarningCircle size={18} weight="duotone" className="text-[#FF9900] shrink-0 mt-0.5" />
          <p className="text-sm text-white/75 font-light leading-relaxed">
            Freight on this line is being re-quoted with our forwarder this week. Set your quantities below
            and we will come back with firm landed figures — usually within one business day.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map(m => {
          const color = pickedColor(m);
          const qty = qtyFor[m.id] || 0;
          const full = containerQty(m, settings);
          const p = priceChair(m, settings, qty || 1, color);
          const features = chairFeatures(m).slice(0, 4);
          const belowMoq = qty > 0 && qty < m.moq;

          return (
            <div
              key={m.id}
              className={`flex flex-col rounded-xl border bg-white/[0.02] overflow-hidden transition-colors ${qty > 0 ? 'border-[#FF9900]/50' : 'border-white/10 hover:border-[#3D8593]/60'}`}
            >
              {/* Photo — the supplier shoots on white, so it gets a white tile */}
              <div className="relative bg-white aspect-[4/5] flex items-center justify-center">
                {color?.imageUrl ? (
                  <img
                    src={color.imageUrl}
                    alt={`${m.name} — ${color.label}`}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Package size={40} weight="duotone" className="text-black/20" />
                )}
                <span className="absolute top-3 left-3 tnum text-[10px] font-black uppercase tracking-widest bg-[#0f1a1c]/85 text-white/80 px-2.5 py-1 rounded-full">
                  {m.modelCode}
                </span>
              </div>

              <div className="flex flex-col flex-1 p-5">
                <h3 className="text-sm font-bold leading-snug mb-1">{m.name}</h3>
                {m.brandPublic && m.brand && (
                  <p className="eyebrow text-white/35 mb-2">{m.brand}</p>
                )}

                <ul className="space-y-1 mt-2 mb-4">
                  {features.map(f => (
                    <li key={f} className="text-xs text-white/55 font-light leading-relaxed flex gap-2">
                      <span className="text-[#7fc2ce] shrink-0">·</span>
                      <span className="capitalize">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Colours */}
                {m.colors.length > 1 && (
                  <div className="flex items-center gap-2 mb-4">
                    {m.colors.map(c => {
                      const on = color?.id === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setColorFor(s => ({ ...s, [m.id]: c.id }))}
                          aria-label={c.label}
                          aria-pressed={on}
                          title={c.upchargeUsd > 0 && showPrices ? `${c.label} · +USD ${c.upchargeUsd}` : c.label}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${on ? 'border-[#FF9900] scale-110' : 'border-white/25 hover:border-white/50'}`}
                          style={{ backgroundColor: SWATCH[c.label] || '#666' }}
                        />
                      );
                    })}
                    <span className="text-[11px] text-white/45 font-medium ml-1">{color?.label}</span>
                  </div>
                )}

                {/* Carton facts — public, they are what freight is charged on */}
                <div className="tnum flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40 font-medium pt-3 border-t border-white/10 mb-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Cube size={12} weight="duotone" className="text-[#7fc2ce]" />
                    {m.cbm.toFixed(3)} m³
                  </span>
                  {m.weightKg && <span>{m.weightKg} kg</span>}
                  <span>Min {m.moq}</span>
                </div>

                {/* Price */}
                <div className="mt-auto">
                  {showPrices && p.unitKES != null ? (
                    <>
                      <p className="tnum text-lg font-black tracking-tight text-white">
                        {money(p.unitKES)}
                        <span className="text-white/40 text-xs font-medium"> /chair landed</span>
                      </p>
                      {full > 0 && (
                        <p className="tnum text-[11px] text-[#7fc2ce] font-medium mt-1">
                          {p.smallLot
                            ? `Container price from ${full.toLocaleString('en-US')} chairs`
                            : `Container rate applied · ${full.toLocaleString('en-US')} fill a 40HC`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="eyebrow text-white/35">
                      {showPrices ? 'Landed price on request' : 'Price locked'}
                    </p>
                  )}

                  {/* Quantity */}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => setQty(m.id, qty - 1)}
                      disabled={qty <= 0}
                      aria-label={`Fewer ${m.name}`}
                      className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-white/70 hover:border-[#3D8593] hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={14} weight="bold" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty || ''}
                      placeholder="0"
                      aria-label={`Quantity of ${m.name}`}
                      onChange={e => setQty(m.id, parseInt(e.target.value, 10) || 0)}
                      className="tnum flex-1 w-full text-center bg-white/[0.04] border border-white/10 rounded-lg py-2 text-sm font-bold text-white placeholder:text-white/25 outline-none focus:border-[#3D8593] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setQty(m.id, qty + 1)}
                      aria-label={`More ${m.name}`}
                      className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-white/70 hover:border-[#3D8593] hover:text-white transition-colors"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  </div>
                  {belowMoq && (
                    <p className="tnum text-[11px] text-[#FF9900] font-medium mt-2">
                      Below our {m.moq}-unit minimum on this model
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running order */}
      {order.lines.length > 0 && (
        <div className="mt-6 rounded-xl border border-[#FF9900]/40 bg-[#FF9900]/[0.06] p-6">
          <p className="eyebrow text-[#FF9900] mb-4">Your schedule</p>

          <div className="space-y-2.5 mb-5">
            {order.lines.map(l => (
              <div key={l.modelId} className="flex justify-between items-baseline gap-4 text-sm">
                <span className="text-white/70 font-light min-w-0 truncate">
                  <span className="tnum font-bold text-white">{l.qty}×</span> {l.name}
                  <span className="text-white/40"> · {l.color}</span>
                </span>
                {order.priced && (
                  <span className="tnum font-bold whitespace-nowrap">
                    {money((l.goodsKES + l.shippingKES) * l.qty)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {order.priced ? (
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex justify-between items-baseline gap-4 text-sm">
                <span className="text-white/55 font-light">Goods</span>
                <span className="tnum font-medium">{money(order.goodsKES)}</span>
              </div>
              <div className="flex justify-between items-baseline gap-4 text-sm">
                <span className="text-white/55 font-light">Freight, duty &amp; clearing</span>
                <span className="tnum font-medium">{money(order.shippingKES)}</span>
              </div>
              <div className="flex justify-between items-baseline gap-4 text-sm">
                <span className="text-white/55 font-light">Procurement &amp; handling</span>
                <span className="tnum font-medium">{money(order.handlingKES)}</span>
              </div>
              <div className="flex justify-between items-baseline gap-4 pt-3 mt-1 border-t border-white/10">
                <span className="eyebrow text-white/60">Landed to your site</span>
                <span className="tnum text-xl font-black tracking-tight text-[#FF9900]">{money(order.totalKES)}</span>
              </div>
              <p className="text-[11px] text-white/45 font-light leading-relaxed pt-3">
                Indicative at today's rates. Your formal quotation confirms factory availability, production
                time and the final landed figure — and it is the only fee we add.
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/60 font-light leading-relaxed pt-4 border-t border-white/10">
              {showPrices
                ? 'We will price this schedule and come back to you with firm landed figures.'
                : 'Identify yourself below and this schedule prices itself instantly.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChairCatalog;
