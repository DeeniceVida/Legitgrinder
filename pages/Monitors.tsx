import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor as MonitorIcon, WhatsappLogo, Plus, Minus, Trash, CircleNotch,
  ArrowRight, Info, CheckCircle
} from '@phosphor-icons/react';
import { Reveal } from '../components/Motion';
import { WHATSAPP_NUMBER } from '../constants';
import {
  MonitorModel, MonitorSettings, PortOption, MonitorColor, DEFAULT_SETTINGS,
  fetchMonitorModels, fetchMonitorSettings, fetchMonitorShipping, fetchPortOptions,
  fetchMonitorColors, optionsForModel, colorsForModel,
  priceMonitor, money, modelTitle, displayCode,
} from '../services/monitors';

interface Line {
  model: MonitorModel;
  qty: number;
  /** The chosen port layout — options and their cost vary by size. */
  port?: PortOption;
  color?: MonitorColor;
  unitKES: number;
}

const RES_ORDER = ['1080p', '2K', 'UWQHD', '4K', '5K Ultrawide', '5K'];

const Monitors: React.FC = () => {
  const [models, setModels] = useState<MonitorModel[]>([]);
  const [settings, setSettings] = useState<MonitorSettings>(DEFAULT_SETTINGS);
  const [shipping, setShipping] = useState<Record<string, number | null>>({});
  const [ports, setPorts] = useState<PortOption[]>([]);
  const [colors, setColors] = useState<MonitorColor[]>([]);
  const [loading, setLoading] = useState(true);

  const [size, setSize] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    Promise.all([
      fetchMonitorModels(), fetchMonitorSettings(), fetchMonitorShipping(),
      fetchPortOptions(), fetchMonitorColors(),
    ])
      .then(([m, s, sh, p, c]) => {
        setModels(m); setSettings(s); setShipping(sh); setPorts(p); setColors(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Built by hand rather than via Set: under this tsconfig, Array.from(new Set())
  // widens to unknown[], which breaks the numeric sort.
  const sizes = useMemo(() => {
    const seen: number[] = [];
    models.forEach(m => { if (!seen.includes(m.sizeInches)) seen.push(m.sizeInches); });
    return seen.sort((a, b) => a - b);
  }, [models]);
  useEffect(() => {
    if (size === null && sizes.length) setSize(sizes.includes(27) ? 27 : sizes[0]);
  }, [sizes, size]);

  /** Cost of a layout to the buyer, over the standard one — factory + markup. */
  const portDeltaKES = (o: PortOption) =>
    o.isStandard ? 0 : Math.round(o.upchargeUsd * settings.usdToKes + settings.configMarkupKes);

  /** Models of the chosen size, grouped by resolution so the price ladder reads clearly. */
  const groups = useMemo(() => {
    const forSize = models.filter(m => m.sizeInches === size);
    const by: Record<string, MonitorModel[]> = {};
    forSize.forEach(m => {
      const k = m.resLabel || 'Other';
      (by[k] = by[k] || []).push(m);
    });
    Object.values(by).forEach(list => list.sort((a, b) => (a.refreshHz || 0) - (b.refreshHz || 0)));
    return Object.entries(by).sort(
      (a, b) => (RES_ORDER.indexOf(a[0]) + 1 || 99) - (RES_ORDER.indexOf(b[0]) + 1 || 99)
    );
  }, [models, size]);

  const addLine = (m: MonitorModel) => {
    const std = optionsForModel(m, ports).find(o => o.isStandard);
    const avail = colorsForModel(m, colors);
    const defColor = avail.find(c => c.isDefault) || avail[0];
    const p = priceMonitor(m, settings, shipping, std, defColor);
    if (p.unitKES == null) return;
    setLines(prev => {
      const i = prev.findIndex(l => l.model.id === m.id && (l.port?.isStandard ?? true));
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { model: m, qty: 1, port: std, color: defColor, unitKES: p.unitKES! }];
    });
  };

  const setPort = (idx: number, optionId: string) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const opt = optionsForModel(l.model, ports).find(o => o.id === optionId);
      const p = priceMonitor(l.model, settings, shipping, opt, l.color);
      return { ...l, port: opt, unitKES: p.unitKES ?? l.unitKES };
    }));
  };

  const setColor = (idx: number, colorId: string) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const col = colorsForModel(l.model, colors).find(c => c.id === colorId);
      const p = priceMonitor(l.model, settings, shipping, l.port, col);
      return { ...l, color: col, unitKES: p.unitKES ?? l.unitKES };
    }));
  };

  const setQty = (idx: number, delta: number) =>
    setLines(prev => prev
      .map((l, i) => (i === idx ? { ...l, qty: Math.max(1, l.qty + delta) } : l))
    );

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const total = lines.reduce((s, l) => s + l.unitKES * l.qty, 0);
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  /** The message the buyer sends across — it has to stand alone in the owner's inbox. */
  const whatsappHref = useMemo(() => {
    if (!lines.length) return '';
    const body =
      `🖥️ MONITOR ENQUIRY\n\n` +
      lines.map(l =>
        `${l.qty} × ${modelTitle(l.model)}${l.model.curved ? ' Curved' : ''}\n` +
        // The series IS useful to the owner, so it rides in the WhatsApp brief.
        `   Model: ${l.model.modelCode}${l.model.series ? ` (${l.model.series})` : ''}\n` +
        (l.color ? `   Colour: ${l.color.label}\n` : '') +
        `   Ports: ${l.port?.label || 'Standard'}\n` +
        `   ${money(l.unitKES)} each → ${money(l.unitKES * l.qty)}`
      ).join('\n\n') +
      `\n\nTOTAL: ${money(total)} for ${totalUnits} unit${totalUnits === 1 ? '' : 's'}` +
      `\n\nPlease confirm availability and lead time.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
  }, [lines, total, totalUnits]);

  const noShippingSizes = sizes.filter(s => {
    const m = models.find(x => x.sizeInches === s);
    return m && priceMonitor(m, settings, shipping).unitKES == null;
  });

  return (
    <div className="bg-brand-bg min-h-screen pt-28 pb-24">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        {/* ── Header ─────────────────────────────────────────── */}
        <Reveal>
          <p className="eyebrow text-[#3D8593] mb-4 flex items-center gap-3">
            <MonitorIcon size={16} weight="duotone" /> Import Catalogue
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.02] text-gray-900 mb-5">
            Monitors we can <span className="heading-accent italic font-light text-[#3D8593]">import for you.</span>
          </h1>
          <p className="text-gray-500 font-light leading-relaxed max-w-2xl mb-3">
            Every price below is landed in Nairobi — factory cost, wooden crate, freight and clearing included.
            Each monitor ships fully specced: speakers, RGB lighting, height-adjustable base and a certified power adapter.
          </p>
          <p className="text-sm text-gray-400 font-light max-w-2xl mb-10">
            Nothing here is held in stock — every unit is sourced to your order. Typically 2–3 weeks by air,
            30–45 days by sea. Pick what you need, then send the list over and we'll confirm availability and lead time.
          </p>
        </Reveal>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-400 py-20">
            <CircleNotch size={20} className="animate-spin" /> Loading catalogue…
          </div>
        ) : models.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500 font-light">
              The catalogue isn't loaded yet. Run <code className="text-[#3D8593] font-mono text-sm">add_monitor_catalog.sql</code> in
              Supabase, or <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="underline text-[#3D8593]">message us</a> for a quote.
            </p>
          </div>
        ) : (
          <>
            {/* ── Size selector ──────────────────────────────── */}
            <div className="flex flex-wrap gap-2 mb-8">
              {sizes.map(s => {
                const on = s === size;
                const count = models.filter(m => m.sizeInches === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-5 py-3 rounded-xl text-sm font-black transition-all ${on
                      ? 'bg-[#0f1a1c] text-white'
                      : 'bg-white text-gray-600 border border-gray-100 hover:border-gray-300'}`}
                  >
                    {s}"
                    <span className={`ml-2 text-[10px] font-bold ${on ? 'text-white/50' : 'text-gray-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* ── The models ───────────────────────────────── */}
              <div className="lg:col-span-2 space-y-5">
                {groups.map(([res, list]) => (
                  <div key={res} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-50 flex items-baseline justify-between">
                      <h2 className="text-sm font-black text-gray-900 tracking-tight">{size}" {res}</h2>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {list[0].widthPx} × {list[0].heightPx}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {list.map(m => {
                        const p = priceMonitor(m, settings, shipping);
                        return (
                          <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors">
                            {m.imageUrl && (
                              <img
                                src={m.imageUrl}
                                alt={modelTitle(m)}
                                loading="lazy"
                                className="w-16 h-12 object-contain rounded-lg bg-neutral-50 shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900">
                                {m.refreshHz}Hz
                                {m.curved && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-1.5 py-0.5 rounded">Curved</span>}
                                {m.baseType === 'Lifting' && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-neutral-50 px-1.5 py-0.5 rounded">Lifting base</span>}
                              </p>
                              {/* Series (Victory / Golden Cudgel / MX) stays internal —
                                  it means nothing to a buyer. Model reference only,
                                  with the factory's "HP-" prefix stripped. */}
                              <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                                Ref {displayCode(m)}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {p.unitKES == null ? (
                                <span className="text-xs font-bold text-gray-400">Quote on request</span>
                              ) : (
                                <span className="text-sm font-black text-gray-900 whitespace-nowrap">{money(p.unitKES)}</span>
                              )}
                              {p.unitKES == null ? (
                                <a
                                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'd like a quote for the ${modelTitle(m)} monitor (ref ${displayCode(m)}).`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="px-3.5 py-2 rounded-lg bg-neutral-100 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors"
                                >
                                  Ask
                                </a>
                              ) : (
                                <button
                                  onClick={() => addLine(m)}
                                  className="px-3.5 py-2 rounded-lg bg-[#3D8593] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0f1a1c] transition-colors"
                                >
                                  Select
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {noShippingSizes.length > 0 && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <Info size={18} weight="duotone" className="text-[#FF9900] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-900/80 font-medium leading-relaxed">
                      {noShippingSizes.map(s => `${s}"`).join(' and ')} are quoted on request — freight for these
                      sizes is confirmed per order.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Selection ────────────────────────────────── */}
              <div className="lg:sticky lg:top-28">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h2 className="text-sm font-black text-gray-900 tracking-tight">Your selection</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {totalUnits ? `${totalUnits} unit${totalUnits === 1 ? '' : 's'}` : 'Nothing picked yet'}
                    </p>
                  </div>

                  {lines.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-gray-400 font-light text-center">
                      Choose a size, then hit Select on the models you want.
                    </p>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-50 max-h-[26rem] overflow-y-auto">
                        {lines.map((l, i) => (
                          <div key={`${l.model.id}-${i}`} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900">{modelTitle(l.model)}</p>
                                <p className="text-[11px] text-gray-400 font-medium">Ref {displayCode(l.model)}</p>
                              </div>
                              <button onClick={() => removeLine(i)} aria-label="Remove" className="text-gray-300 hover:text-rose-500 transition-colors shrink-0">
                                <Trash size={15} weight="bold" />
                              </button>
                            </div>

                            {(() => {
                              const cols = colorsForModel(l.model, colors);
                              if (cols.length < 2) return null;
                              return (
                                <div className="flex items-center gap-1.5 mb-2.5">
                                  {cols.map(c => {
                                    const on = l.color?.id === c.id;
                                    const extra = c.upchargeUsd > 0
                                      ? Math.round(c.upchargeUsd * settings.usdToKes) : 0;
                                    return (
                                      <button
                                        key={c.id}
                                        onClick={() => setColor(i, c.id)}
                                        aria-pressed={on}
                                        title={extra ? `${c.label} · +${money(extra)}` : c.label}
                                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${on
                                          ? 'border-[#3D8593] bg-teal-50 text-[#3D8593]'
                                          : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}
                                      >
                                        {c.label}{extra ? ` +${(extra / 1000).toFixed(1)}k` : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {(() => {
                              const opts = optionsForModel(l.model, ports);
                              if (opts.length < 2) return null;
                              return (
                                <select
                                  value={l.port?.id || ''}
                                  onChange={e => setPort(i, e.target.value)}
                                  className="w-full mb-2.5 bg-neutral-50 border border-gray-100 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-700 outline-none focus:border-[#3D8593]"
                                >
                                  {opts.map(o => {
                                    const d = portDeltaKES(o);
                                    return (
                                      <option key={o.id} value={o.id}>
                                        {o.label}{o.isStandard ? ' — standard' : ` — +${money(d)}`}
                                      </option>
                                    );
                                  })}
                                </select>
                              );
                            })()}

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setQty(i, -1)} aria-label="Fewer" className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593] transition-colors">
                                  <Minus size={12} weight="bold" />
                                </button>
                                <span className="w-9 text-center text-sm font-black text-gray-900">{l.qty}</span>
                                <button onClick={() => setQty(i, 1)} aria-label="More" className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593] transition-colors">
                                  <Plus size={12} weight="bold" />
                                </button>
                              </div>
                              <span className="text-sm font-black text-gray-900 whitespace-nowrap">{money(l.unitKES * l.qty)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="px-5 py-4 border-t border-gray-100 bg-neutral-50/60">
                        <div className="flex items-baseline justify-between mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total landed</span>
                          <span className="text-xl font-black text-gray-900 tracking-tight">{money(total)}</span>
                        </div>
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#25D366] text-white font-black uppercase text-[11px] tracking-widest hover:brightness-95 transition-all"
                        >
                          <WhatsappLogo size={17} weight="fill" /> Send this selection
                        </a>
                        <p className="text-[10px] text-gray-400 font-medium text-center mt-3 leading-relaxed">
                          Opens WhatsApp with your list ready to send. We confirm stock and lead time before anything is paid.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Included on every unit</p>
                  <ul className="space-y-2">
                    {['Speakers', 'RGB lighting', 'Height-adjustable base', 'Certified power adapter', 'Wooden crate packaging'].map(x => (
                      <li key={x} className="flex items-center gap-2.5 text-[12px] font-medium text-gray-600">
                        <CheckCircle size={14} weight="fill" className="text-[#3D8593] shrink-0" /> {x}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-[11px] text-gray-400 font-light leading-relaxed mt-4 px-1">
                  Buying in volume? <Link to="/corporate" className="text-[#3D8593] underline">Corporate procurement</Link> gets
                  you bulk pricing on 5 units and up.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Monitors;
