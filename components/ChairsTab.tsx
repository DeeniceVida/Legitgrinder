import React, { useEffect, useMemo, useState } from 'react';
import { Save, Check, AlertTriangle, Search, RefreshCcw } from 'lucide-react';
import SafeImage from './SafeImage';
import {
  ChairModel, ChairSettings, HandlingBand, DEFAULT_CHAIR_SETTINGS,
  fetchChairModels, fetchChairSettings, fetchHandlingBands,
  updateChairSettings, updateChairModel, updateChairColor, updateHandlingBand,
  priceChair, handlingFee, containerQty, defaultColor, money,
} from '../services/chairs';

/**
 * Admin → Chairs. Everything that moves a chair price lives here: the global
 * rates, the tapering handling fee, and each model's container cost and colour
 * upcharges. The landed price recalculates as you type, so the effect of an
 * edit is visible before it's saved.
 *
 * The one figure that can be blank is KES per CBM. While it is, the catalogue
 * shows specifications but no prices — deliberately, so the page can never
 * quote a number nobody approved.
 */

const RATE_FIELDS: { key: keyof ChairSettings; label: string; hint?: string; suffix: string }[] = [
  { key: 'usdToKes', label: 'USD → KES', suffix: 'KES', hint: 'Repricing the whole catalogue starts here' },
  { key: 'txnPct', label: 'Transaction fee', suffix: '%', hint: 'Charged on the whole supplier invoice' },
  { key: 'freightUsd', label: 'Freight (USD part)', suffix: 'USD', hint: 'Inside the supplier invoice, per chair' },
  { key: 'smallLotUsd', label: 'Below-container uplift', suffix: 'USD', hint: 'Added per chair on any order under a container' },
  { key: 'marginUsd', label: 'Your per-chair cut', suffix: 'USD', hint: 'Usually 0 — your cut is the handling fee' },
  { key: 'containerCbm', label: 'Usable 40HC volume', suffix: 'm³', hint: 'Sets the quantity where container pricing starts' },
];

/** A representative small order, for the price preview column. */
const SAMPLE_QTY = 20;

const ChairsTab: React.FC = () => {
  const [models, setModels] = useState<ChairModel[]>([]);
  const [settings, setSettings] = useState<ChairSettings>(DEFAULT_CHAIR_SETTINGS);
  const [bands, setBands] = useState<HandlingBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openColors, setOpenColors] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchChairModels(false), fetchChairSettings(), fetchHandlingBands()])
      .then(([m, s, b]) => { setModels(m); setSettings(s); setBands(b); })
      .catch(e => setError(e?.message || 'Could not load the catalogue'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const flash = (what: string) => { setSaved(what); setTimeout(() => setSaved(null), 2200); };

  const saveRates = async () => {
    setSaving('rates'); setError(null);
    const res = await updateChairSettings(settings);
    setSaving(null);
    res.success ? flash('rates') : setError(res.error || 'Could not save the rates');
  };

  const saveBand = async (b: HandlingBand) => {
    setSaving(b.id); setError(null);
    const res = await updateHandlingBand(b.id, { pct: b.pct, upToKes: b.upToKes, minFeeKes: b.minFeeKes });
    setSaving(null);
    res.success ? flash(b.id) : setError(res.error || 'Could not save the band');
  };

  const patchModel = (id: string, patch: Partial<ChairModel>) =>
    setModels(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const saveModel = async (m: ChairModel) => {
    setSaving(m.id); setError(null);
    const res = await updateChairModel(m.id, { containerUsd: m.containerUsd, moq: m.moq, name: m.name });
    setSaving(null);
    res.success ? flash(m.id) : setError(res.error || 'Could not save the model');
  };

  /** Publish or hide a model. Saved immediately — a toggle you have to remember
   *  to save is a toggle that lies about the site's state. */
  const toggleActive = async (m: ChairModel) => {
    const next = !m.isActive;
    patchModel(m.id, { isActive: next });
    setSaving(m.id); setError(null);
    const res = await updateChairModel(m.id, { isActive: next });
    setSaving(null);
    if (res.success) flash(m.id);
    else { patchModel(m.id, { isActive: m.isActive }); setError(res.error || 'Could not change visibility'); }
  };

  const saveColor = async (modelId: string, colorId: string) => {
    const m = models.find(x => x.id === modelId);
    const c = m?.colors.find(x => x.id === colorId);
    if (!c) return;
    setSaving(colorId); setError(null);
    const res = await updateChairColor(colorId, { upchargeUsd: c.upchargeUsd, imageUrl: c.imageUrl ?? null });
    setSaving(null);
    res.success ? flash(colorId) : setError(res.error || 'Could not save the colour');
  };

  const patchColor = (modelId: string, colorId: string, patch: Partial<ChairModel['colors'][0]>) =>
    setModels(prev => prev.map(m => m.id !== modelId ? m : {
      ...m, colors: m.colors.map(c => (c.id === colorId ? { ...c, ...patch } : c)),
    }));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter(m => `${m.modelCode} ${m.name} ${m.description || ''}`.toLowerCase().includes(q));
  }, [models, search]);

  const rateUnset = settings.kesPerCbm == null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-rose-900">{error}</p>
        </div>
      )}

      {rateUnset && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium text-amber-900/80 leading-relaxed">
            <strong>No chair prices are showing on /corporate.</strong> Set <em>Freight, duty &amp; clearing</em> below
            — the KES you pay per cubic metre, landed — and every chair prices itself instantly. Until then
            buyers see photos, specifications and minimums only.
          </p>
        </div>
      )}

      {/* ── Rates ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Rates</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Every chair reprices from these
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-colors" title="Reload">
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={saveRates}
              disabled={saving === 'rates'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40"
            >
              {saved === 'rates' ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save rates</>}
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* The one field allowed to be empty gets its own treatment — a 0 here
              would quote free shipping rather than hide the price. */}
          <div className={rateUnset ? 'ring-2 ring-[#FF9900]/40 rounded-lg p-2 -m-2' : ''}>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Freight, duty &amp; clearing
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                value={settings.kesPerCbm ?? ''}
                placeholder="—"
                onChange={e => setSettings(s => ({
                  ...s, kesPerCbm: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                }))}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
              />
              <span className="text-[10px] font-black text-gray-400 shrink-0">/m³</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-1 leading-snug">
              All-in per cubic metre. Clear it to hide every chair price.
            </p>
          </div>

          {RATE_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={Number(settings[f.key] ?? 0)}
                  onChange={e => setSettings(s => ({ ...s, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                />
                <span className="text-[10px] font-black text-gray-400 shrink-0">{f.suffix}</span>
              </div>
              {f.hint && <p className="text-[10px] text-gray-400 font-medium mt-1 leading-snug">{f.hint}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Handling fee ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50">
          <h3 className="text-sm font-black text-gray-900 tracking-tight">Procurement &amp; handling fee</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            The only fee on a corporate quote — charged on goods value, never on freight or duty
          </p>
        </div>
        <div className="p-6 space-y-3">
          {bands.map((b, i) => (
            <div key={b.id} className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {b.upToKes == null ? 'Above the last band' : 'Goods value up to'}
                </label>
                <input
                  type="number"
                  value={b.upToKes ?? ''}
                  placeholder="No ceiling"
                  disabled={b.upToKes == null}
                  onChange={e => setBands(prev => prev.map(x => x.id === b.id
                    ? { ...x, upToKes: e.target.value === '' ? null : parseFloat(e.target.value) || 0 } : x))}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors disabled:text-gray-400"
                />
              </div>
              <div className="w-24">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Fee</label>
                <input
                  type="number"
                  step="0.1"
                  value={b.pct}
                  onChange={e => setBands(prev => prev.map(x => x.id === b.id
                    ? { ...x, pct: parseFloat(e.target.value) || 0 } : x))}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                />
              </div>
              <div className="w-32">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Minimum</label>
                <input
                  type="number"
                  value={b.minFeeKes}
                  onChange={e => setBands(prev => prev.map(x => x.id === b.id
                    ? { ...x, minFeeKes: parseFloat(e.target.value) || 0 } : x))}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                />
              </div>
              <button
                onClick={() => saveBand(b)}
                disabled={saving === b.id}
                className="px-4 py-2.5 rounded-xl bg-neutral-50 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors disabled:opacity-40"
              >
                {saved === b.id ? 'Saved' : 'Save'}
              </button>
              <p className="text-[10px] text-gray-400 font-medium leading-snug flex-1 min-w-[10rem]">
                Band {i + 1} · {b.pct}% of goods, minimum {money(b.minFeeKes)}
              </p>
            </div>
          ))}
          {!bands.length && !loading && (
            <p className="text-sm text-gray-400 font-medium">
              No bands yet — run <code>add_chair_catalog.sql</code> to create them.
            </p>
          )}
        </div>
      </div>

      {/* ── Models ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Ergonomic models <span className="text-gray-400 font-bold">({visible.length})</span>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Container cost, minimum, and what a buyer actually pays
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search models…"
              className="pl-9 pr-3 py-2.5 w-56 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-400 font-medium">Loading…</p>
        ) : !models.length ? (
          <p className="p-6 text-sm text-gray-400 font-medium">
            No chairs yet — run <code>add_chair_catalog.sql</code> in Supabase.
          </p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {visible.map(m => {
              const full = containerQty(m, settings);
              const small = priceChair(m, settings, SAMPLE_QTY, defaultColor(m));
              const bulk = priceChair(m, settings, full || 99999, defaultColor(m));
              const photo = defaultColor(m)?.imageUrl;
              const open = openColors === m.id;

              return (
                <div key={m.id} className="p-4 md:px-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {photo
                      ? <SafeImage src={photo} alt={m.name} className="w-14 h-16 object-contain rounded-lg bg-neutral-50 border border-neutral-100 shrink-0" />
                      : <div className="w-14 h-16 rounded-lg bg-neutral-50 border border-neutral-100 shrink-0" />}

                    <div className="min-w-0 flex-1 basis-48">
                      <input
                        value={m.name}
                        onChange={e => patchModel(m.id, { name: e.target.value })}
                        className="w-full bg-transparent text-sm font-black text-gray-900 tracking-tight outline-none focus:bg-neutral-50 rounded px-1 -mx-1 py-0.5"
                      />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {m.modelCode} · {m.cbm.toFixed(3)} m³{m.weightKg ? ` · ${m.weightKg} kg` : ''}
                        {full > 0 && ` · ${full}/container`}
                      </p>
                    </div>

                    <div className="w-24">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Container $</label>
                      <input
                        type="number"
                        step="0.01"
                        value={m.containerUsd}
                        onChange={e => patchModel(m.id, { containerUsd: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                      />
                    </div>

                    <div className="w-20">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Min qty</label>
                      <input
                        type="number"
                        value={m.moq}
                        onChange={e => patchModel(m.id, { moq: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                      />
                    </div>

                    {/* What a buyer pays, recalculated as you type */}
                    <div className="w-40 shrink-0">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Landed / chair</label>
                      {small.unitKES == null ? (
                        <p className="text-[11px] font-bold text-[#FF9900]">Hidden — no freight rate</p>
                      ) : (
                        <>
                          <p className="text-sm font-black text-gray-900">{money(small.unitKES)}<span className="text-[10px] font-bold text-gray-400"> at {SAMPLE_QTY}</span></p>
                          {bulk.unitKES != null && full > 0 && (
                            <p className="text-[10px] font-bold text-[#3D8593]">{money(bulk.unitKES)} at {full}</p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setOpenColors(open ? null : m.id)}
                        className="px-3 py-2 rounded-xl border border-neutral-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:border-[#3D8593] hover:text-[#3D8593] transition-colors"
                      >
                        {m.colors.length} colour{m.colors.length === 1 ? '' : 's'}
                      </button>
                      <button
                        onClick={() => toggleActive(m)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${m.isActive ? 'bg-[#3D8593] text-white' : 'bg-neutral-100 text-gray-400'}`}
                      >
                        {m.isActive ? 'Live' : 'Off'}
                      </button>
                      <button
                        onClick={() => saveModel(m)}
                        disabled={saving === m.id}
                        className="px-4 py-2 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40"
                      >
                        {saved === m.id ? <Check className="w-3.5 h-3.5" /> : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Colours */}
                  {open && (
                    <div className="mt-4 pt-4 border-t border-neutral-50 space-y-3">
                      {m.colors.map(c => (
                        <div key={c.id} className="flex flex-wrap items-end gap-3">
                          <div className="w-24">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Colour</label>
                            <p className="text-sm font-bold text-gray-900 py-2">{c.label}</p>
                          </div>
                          <div className="w-24">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Upcharge $</label>
                            <input
                              type="number"
                              step="0.01"
                              value={c.upchargeUsd}
                              onChange={e => patchColor(m.id, c.id, { upchargeUsd: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                            />
                          </div>
                          <div className="flex-1 min-w-[14rem]">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Photo</label>
                            <input
                              value={c.imageUrl || ''}
                              placeholder="/chairs/t6-black.png  or  https://res.cloudinary.com/…"
                              onChange={e => patchColor(m.id, c.id, { imageUrl: e.target.value })}
                              className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
                            />
                          </div>
                          <button
                            onClick={() => saveColor(m.id, c.id)}
                            disabled={saving === c.id}
                            className="px-4 py-2 rounded-xl bg-neutral-50 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors disabled:opacity-40"
                          >
                            {saved === c.id ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What the fee actually comes to, on a real order */}
      {!rateUnset && bands.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <h3 className="text-sm font-black text-gray-900 tracking-tight mb-3">Fee check</h3>
          <div className="flex flex-wrap gap-6">
            {[250000, 800000, 2000000, 5000000].map(v => (
              <div key={v}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{money(v)} of goods</p>
                <p className="text-sm font-black text-gray-900 mt-0.5">{money(handlingFee(v, bands))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChairsTab;
