import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor as MonitorIcon, WhatsappLogo, Plus, Minus, Trash, CircleNotch,
  ArrowRight, Info, CheckCircle, X, ShieldCheck, Package, MagnifyingGlassPlus
} from '@phosphor-icons/react';
import { Reveal } from '../components/Motion';
import SafeImage from '../components/SafeImage';
import { WHATSAPP_NUMBER } from '../constants';
import {
  MonitorModel, MonitorSettings, PortOption, MonitorColor, DEFAULT_SETTINGS,
  fetchMonitorModels, fetchMonitorSettings, fetchMonitorShipping, fetchPortOptions,
  fetchMonitorColors, optionsForModel, colorsForModel,
  priceMonitor, serviceFeeFor, money, modelTitle, displayCode,
} from '../services/monitors';

/** Used when the dashboard's crate photo field is left blank. */
const CRATE_PHOTO_FALLBACK = '/monitors/packaging.jpg';

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

  /** The monitor being examined before it's added, and its chosen options. */
  const [detail, setDetail] = useState<MonitorModel | null>(null);
  const [dPort, setDPort] = useState<PortOption | undefined>();
  const [dColor, setDColor] = useState<MonitorColor | undefined>();
  const [dQty, setDQty] = useState(1);
  const [crateOpen, setCrateOpen] = useState(false);
  const [crateOk, setCrateOk] = useState(true);
  // Set from the dashboard; a Cloudinary URL or a path under public/.
  const crateSrc = settings.cratePhotoUrl || CRATE_PHOTO_FALLBACK;

  const openDetail = (m: MonitorModel) => {
    const opts = optionsForModel(m, ports);
    const cols = colorsForModel(m, colors);
    setDetail(m);
    setDPort(opts.find(o => o.isStandard) || opts[0]);
    setDColor(cols.find(c => c.isDefault) || cols[0]);
    setDQty(1);
  };

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

  /** Commit whatever is configured in the detail view to the selection. */
  const addConfigured = () => {
    if (!detail) return;
    const p = priceMonitor(detail, settings, shipping, dPort, dColor);
    if (p.unitKES == null) return;
    setLines(prev => {
      const i = prev.findIndex(l =>
        l.model.id === detail.id && l.port?.id === dPort?.id && l.color?.id === dColor?.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + dQty };
        return next;
      }
      return [...prev, { model: detail, qty: dQty, port: dPort, color: dColor, unitKES: p.unitKES! }];
    });
    setDetail(null);
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

  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  /** The three parts, for the whole order. Service fee applies once. */
  const order = useMemo(() => {
    let buying = 0, shippingTotal = 0;
    lines.forEach(l => {
      const p = priceMonitor(l.model, settings, shipping, l.port, l.color);
      buying += p.parts.buyingKES * l.qty;
      shippingTotal += p.parts.shippingKES * l.qty;
    });
    const service = serviceFeeFor(buying, settings);
    return { buying, shipping: shippingTotal, service, total: buying + shippingTotal + service };
  }, [lines, settings, shipping]);

  const total = order.total;

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
      `\n\nBuying price: ${money(order.buying)}` +
      `\nShipping fee: ${money(order.shipping)}` +
      `\nService fee: ${money(order.service)}` +
      `\nTOTAL: ${money(total)} for ${totalUnits} unit${totalUnits === 1 ? '' : 's'}` +
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
                              <SafeImage
                                src={m.imageUrl}
                                alt={modelTitle(m)}
                                showPlaceholder={false}
                                className="w-16 h-12 object-contain rounded-lg bg-neutral-50 shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900">
                                {m.refreshHz}Hz
                                {m.curved && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-[#3D8593] bg-teal-50 px-1.5 py-0.5 rounded">Curved</span>}
                                {m.baseType === 'Lifting' && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-neutral-50 px-1.5 py-0.5 rounded">Lifting base</span>}
                              </p>
                              {/* The factory's own line names (Victory, Golden Cudgel,
                                  MX) stay internal — they mean nothing to a buyer.
                                  A series flagged series_public is shown. */}
                              <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                                {m.seriesPublic && m.series && (
                                  <span className="font-black text-[#3D8593] mr-1.5">{m.series}</span>
                                )}
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
                                  onClick={() => openDetail(m)}
                                  className="px-3.5 py-2 rounded-lg bg-[#3D8593] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0f1a1c] transition-colors"
                                >
                                  View
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
                        {/* The three parts, exactly as the How It Works page promises */}
                        <div className="space-y-2 mb-3.5">
                          {[
                            { label: 'Buying price', val: order.buying, note: 'Item, options & wooden crate' },
                            { label: 'Shipping fee', val: order.shipping, note: 'Freight & clearing to Nairobi' },
                            { label: 'Service fee', val: order.service, note: 'Our sourcing fee, once per order' },
                          ].map(r => (
                            <div key={r.label} className="flex items-baseline justify-between gap-3">
                              <span className="text-[11px] font-bold text-gray-500">
                                {r.label}
                                <span className="block text-[9px] font-medium text-gray-400">{r.note}</span>
                              </span>
                              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{money(r.val)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-baseline justify-between mb-4 pt-3 border-t border-gray-200">
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

      {/* ── Detail view: the photo, the specs, the options, the maths ───── */}
      {detail && (() => {
        const p = priceMonitor(detail, settings, shipping, dPort, dColor);
        const opts = optionsForModel(detail, ports);
        const cols = colorsForModel(detail, colors);
        const specs: [string, string][] = [
          ['Screen size', `${detail.sizeInches} inches`],
          ['Resolution', `${detail.resLabel || ''} ${detail.widthPx && detail.heightPx ? `· ${detail.widthPx} × ${detail.heightPx}` : ''}`.trim()],
          ['Refresh rate', detail.refreshHz ? `${detail.refreshHz} Hz` : '—'],
          ['Screen', `${detail.curved ? 'Curved' : 'Flat'}${detail.panelType ? ` · ${detail.panelType} panel` : ''}`],
          ['Stand', detail.baseType === 'Lifting' ? 'Height-adjustable lifting base' : 'Height-adjustable base'],
          ['Sound', 'Built-in speakers'],
          ['Lighting', 'RGB backlighting'],
          ['Power', 'Certified adapter'],
        ];
        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6"
            onClick={() => setDetail(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] sm:rounded-[1.75rem]"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur px-5 sm:px-7 py-4 border-b border-gray-100 flex items-start justify-between gap-4 z-10">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    {detail.seriesPublic && detail.series && (
                      <span className="text-[#3D8593]">{detail.series} </span>
                    )}
                    {modelTitle(detail)}
                  </h2>
                  <p className="text-[11px] font-medium text-gray-400">Ref {displayCode(detail)}</p>
                </div>
                <button onClick={() => setDetail(null)} aria-label="Close" className="text-gray-300 hover:text-gray-900 transition-colors shrink-0">
                  <X size={20} weight="bold" />
                </button>
              </div>

              <div className="p-5 sm:p-7 grid md:grid-cols-2 gap-6">
                {/* Photo + trust */}
                <div>
                  {detail.imageUrl ? (
                    <SafeImage
                      src={detail.imageUrl}
                      alt={modelTitle(detail)}
                      className="w-full h-56 object-contain rounded-2xl bg-neutral-50"
                    />
                  ) : (
                    <div className="w-full h-56 rounded-2xl bg-neutral-50 flex items-center justify-center">
                      <MonitorIcon size={40} weight="duotone" className="text-gray-200" />
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 mt-4 p-3.5 rounded-xl bg-teal-50/70 border border-teal-100">
                    <ShieldCheck size={20} weight="duotone" className="text-[#3D8593] shrink-0" />
                    <p className="text-[12px] font-bold text-gray-700 leading-snug">
                      1 year manufacturer's warranty
                      <span className="block text-[10px] font-medium text-gray-500">Provided by the manufacturer, not by us</span>
                    </p>
                  </div>

                  {/* Deliberately an icon, not a thumbnail: the crate photo is a
                      full-resolution shot, and nobody should pay to download it
                      on mobile unless they actually ask to see it. */}
                  {crateOk && (
                    <button
                      onClick={() => setCrateOpen(true)}
                      className="w-full flex items-center gap-3 mt-3 p-3 rounded-xl border border-gray-100 hover:border-[#3D8593]/40 transition-colors text-left group"
                    >
                      <span className="w-11 h-11 rounded-lg bg-orange-50 text-[#FF9900] flex items-center justify-center shrink-0">
                        <Package size={22} weight="duotone" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold text-gray-700">Ships in a wooden crate</span>
                        <span className="block text-[10px] font-medium text-gray-400 group-hover:text-[#3D8593] transition-colors">
                          Tap to see how it's packed
                        </span>
                      </span>
                      <MagnifyingGlassPlus size={16} weight="bold" className="text-gray-300 ml-auto shrink-0" />
                    </button>
                  )}
                </div>

                {/* Specs + options + price */}
                <div>
                  <p className="eyebrow text-gray-400 mb-3">Specifications</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-6">
                    {specs.map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400">{k}</dt>
                        <dd className="text-[12px] font-bold text-gray-800">{v || '—'}</dd>
                      </div>
                    ))}
                  </dl>

                  {cols.length > 1 && (
                    <>
                      <p className="eyebrow text-gray-400 mb-2">Colour</p>
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {cols.map(c => {
                          const on = dColor?.id === c.id;
                          const extra = c.upchargeUsd > 0 ? Math.round(c.upchargeUsd * settings.usdToKes) : 0;
                          return (
                            <button
                              key={c.id}
                              onClick={() => setDColor(c)}
                              aria-pressed={on}
                              className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${on
                                ? 'border-[#3D8593] bg-teal-50 text-[#3D8593]'
                                : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}
                            >
                              {c.label}{extra ? ` +${money(extra).replace('KES ', '')}` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {opts.length > 1 && (
                    <>
                      <p className="eyebrow text-gray-400 mb-2">Ports</p>
                      <select
                        value={dPort?.id || ''}
                        onChange={e => setDPort(opts.find(o => o.id === e.target.value))}
                        className="w-full mb-5 bg-neutral-50 border border-gray-100 rounded-lg px-3 py-2.5 text-[11px] font-bold text-gray-700 outline-none focus:border-[#3D8593]"
                      >
                        {opts.map(o => {
                          const d = o.isStandard ? 0
                            : Math.round(o.upchargeUsd * settings.usdToKes + settings.configMarkupKes);
                          return (
                            <option key={o.id} value={o.id}>
                              {o.label}{o.isStandard ? ' — standard' : ` — +${money(d)}`}
                            </option>
                          );
                        })}
                      </select>
                    </>
                  )}

                  {/* The two per-unit parts, then the fee that applies once */}
                  <div className="rounded-xl bg-neutral-50 p-4 mb-4">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-gray-500">Buying price</span>
                      <span className="text-sm font-bold text-gray-900">{money(p.parts.buyingKES)}</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-gray-500">Shipping fee</span>
                      <span className="text-sm font-bold text-gray-900">{money(p.parts.shippingKES)}</span>
                    </div>
                    <div className="flex items-baseline justify-between pt-2.5 border-t border-gray-200">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Per unit</span>
                      <span className="text-lg font-black text-gray-900 tracking-tight">{money(p.unitKES || 0)}</span>
                    </div>
                    <p className="text-[10px] font-medium text-gray-400 mt-2.5 leading-relaxed">
                      A service fee of {money(settings.serviceFeeKes)} is added once per order — not per unit.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDQty(q => Math.max(1, q - 1))} aria-label="Fewer" className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593] transition-colors">
                        <Minus size={12} weight="bold" />
                      </button>
                      <span className="w-9 text-center text-sm font-black text-gray-900">{dQty}</span>
                      <button onClick={() => setDQty(q => q + 1)} aria-label="More" className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#3D8593] transition-colors">
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                    <button
                      onClick={addConfigured}
                      className="flex-1 py-3.5 rounded-full bg-[#3D8593] text-white font-black uppercase text-[11px] tracking-widest hover:bg-[#0f1a1c] transition-colors"
                    >
                      Add to selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Crate photo, full size ─────────────────────────────────────── */}
      {crateOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-5"
          onClick={() => setCrateOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-white font-bold text-sm">
                <Package size={18} weight="duotone" className="text-[#FF9900]" /> How your monitor is packed
              </p>
              <button onClick={() => setCrateOpen(false)} aria-label="Close" className="text-white/60 hover:text-white transition-colors">
                <X size={20} weight="bold" />
              </button>
            </div>
            <SafeImage src={crateSrc} alt="Wooden shipping crate" className="w-full rounded-2xl bg-white" />
            <p className="text-white/70 text-[12px] font-light leading-relaxed mt-3">
              Every monitor travels in a purpose-built wooden crate — the cost is already inside the buying price.
              It is why our screens arrive intact when boxed ones don't.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitors;
