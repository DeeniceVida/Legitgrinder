import React, { useEffect, useMemo, useState } from 'react';
import { Save, Check, AlertTriangle, Search, RefreshCcw } from 'lucide-react';
import {
  MonitorModel, MonitorSettings, PortOption, DEFAULT_SETTINGS, STOCK_PHOTOS,
  fetchMonitorModels, fetchMonitorSettings, fetchMonitorShipping, fetchPortOptions,
  updateMonitorSettings, updateMonitorShipping, updateMonitorModel,
  priceMonitor, money, modelTitle, displayCode, sizeGroup, optionsForModel,
} from '../services/monitors';

/**
 * Admin → Monitors. Everything that moves a price lives here so the owner never
 * needs the Supabase table editor: the global rates, freight per size, and each
 * model's factory cost. The landed price recalculates as you type, so the effect
 * of an edit is visible before it's saved.
 */

const RATE_FIELDS: { key: keyof MonitorSettings; label: string; hint?: string; suffix: string }[] = [
  { key: 'usdToKes', label: 'USD → KES', suffix: 'KES', hint: 'Repricing the whole catalogue starts here' },
  { key: 'alibabaPct', label: 'Alibaba cut', suffix: '%' },
  { key: 'crateUsd', label: 'Wooden crate', suffix: 'USD', hint: 'Carries $5 of your cut' },
  { key: 'freightUsd', label: 'Freight (USD part)', suffix: 'USD', hint: 'Carries $10 of your cut' },
  { key: 'marginUsd', label: 'Explicit margin', suffix: 'USD', hint: 'Normally 0 — it is distributed above' },
  { key: 'speakersLowUsd', label: 'Speakers under 165Hz', suffix: 'USD' },
  { key: 'speakersHighUsd', label: 'Speakers 165Hz+', suffix: 'USD' },
  { key: 'rgbUsd', label: 'RGB lighting', suffix: 'USD' },
  { key: 'adjBaseUsd', label: 'Adjustable base', suffix: 'USD', hint: 'Only charged where the base is Fixed' },
  { key: 'certAdapterUsd', label: 'Certified adapter', suffix: 'USD' },
  { key: 'configMarkupKes', label: 'Port-change markup', suffix: 'KES', hint: 'On top of the factory upcharge' },
  { key: 'serviceFeeKes', label: 'Service fee', suffix: 'KES', hint: 'Once per order, not per unit' },
  { key: 'serviceFeeThresholdKes', label: 'Service fee switches at', suffix: 'KES', hint: 'Above this, the % below applies instead' },
  { key: 'serviceFeePctOver', label: 'Service fee above that', suffix: '%', hint: 'Of the buying price' },
  { key: 'serviceFeePct', label: 'Legacy % on unit', suffix: '%', hint: 'Leave at 0 — superseded by the fee above' },
];

const SIZE_LABEL: Record<string, string> = {
  '21': '21.45 – 21.5"', '24': '23.8 – 24.5"', '27': '27"',
  '32': '32"', '34': '34"', '40': '40"', '49': '49"',
};

const MonitorsTab: React.FC = () => {
  const [models, setModels] = useState<MonitorModel[]>([]);
  const [settings, setSettings] = useState<MonitorSettings>(DEFAULT_SETTINGS);
  const [shipping, setShipping] = useState<Record<string, number | null>>({});
  const [ports, setPorts] = useState<PortOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<'all' | number>('all');

  const load = () => {
    setLoading(true);
    Promise.all([fetchMonitorModels(false), fetchMonitorSettings(), fetchMonitorShipping(), fetchPortOptions()])
      .then(([m, s, sh, p]) => { setModels(m); setSettings(s); setShipping(sh); setPorts(p); })
      .catch(e => setError(e?.message || 'Could not load the catalogue'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const flash = (what: string) => { setSaved(what); setTimeout(() => setSaved(null), 2200); };

  const saveRates = async () => {
    setSaving('rates'); setError(null);
    const res = await updateMonitorSettings(settings);
    setSaving(null);
    res.success ? flash('rates') : setError(res.error || 'Could not save the rates');
  };

  const saveShipping = async (group: string) => {
    setSaving(`ship-${group}`); setError(null);
    const res = await updateMonitorShipping(group, shipping[group] ?? null);
    setSaving(null);
    res.success ? flash(`ship-${group}`) : setError(res.error || 'Could not save the freight figure');
  };

  const saveModel = async (m: MonitorModel) => {
    setSaving(m.id); setError(null);
    const res = await updateMonitorModel(m.id, {
      factoryUsd: m.factoryUsd, imageUrl: m.imageUrl ?? null,
      availableColors: m.availableColors,
    });
    setSaving(null);
    res.success ? flash(m.id) : setError(res.error || 'Could not save the model');
  };

  const patchModel = (id: string, patch: Partial<MonitorModel>) =>
    setModels(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const sizes = useMemo(() => {
    const seen: number[] = [];
    models.forEach(m => { if (!seen.includes(m.sizeInches)) seen.push(m.sizeInches); });
    return seen.sort((a, b) => a - b);
  }, [models]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter(m => {
      if (sizeFilter !== 'all' && m.sizeInches !== sizeFilter) return false;
      if (!q) return true;
      return [m.modelCode, m.series, m.resLabel, String(m.refreshHz), String(m.sizeInches)]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [models, search, sizeFilter]);

  const missingFreight = Object.entries(shipping).filter(([, v]) => v == null).map(([k]) => k);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-rose-900">{error}</p>
        </div>
      )}

      {missingFreight.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-[#FF9900] shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium text-amber-900/80 leading-relaxed">
            No freight figure for {missingFreight.map(g => SIZE_LABEL[g] || g).join(', ')} — those sizes show
            “Quote on request” instead of a price. Fill them in below to switch them on.
          </p>
        </div>
      )}

      {/* ── Rates ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Rates</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Every monitor reprices from these
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
          {RATE_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={Number(settings[f.key])}
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

      {/* ── Crate photo ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Wooden crate photo</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Shown on every monitor as “how it’s packed”
            </p>
          </div>
          <button
            onClick={saveRates}
            disabled={saving === 'rates'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
        <div className="p-6 flex flex-wrap items-start gap-5">
          <div className="flex-1 min-w-[16rem]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Image URL
            </label>
            <input
              value={settings.cratePhotoUrl}
              onChange={e => setSettings(s => ({ ...s, cratePhotoUrl: e.target.value }))}
              placeholder="https://res.cloudinary.com/…  or  /monitors/packaging.jpg"
              className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
            />
            <p className="text-[10px] text-gray-400 font-medium mt-1.5 leading-snug">
              A Cloudinary link, or a path to a file committed under <code>public/</code>.
              Leave blank and the prompt is hidden entirely.
            </p>
          </div>
          {settings.cratePhotoUrl && (
            <img
              src={settings.cratePhotoUrl}
              alt="Crate preview"
              className="w-32 h-24 object-cover rounded-xl bg-neutral-50 border border-neutral-100"
            />
          )}
        </div>
      </div>

      {/* ── Freight per size ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50">
          <h3 className="text-sm font-black text-gray-900 tracking-tight">Freight per size</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            KES per unit, landed. Clear a field to take it off sale.
          </p>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {Object.keys(SIZE_LABEL).map(g => (
            <div key={g}>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                {SIZE_LABEL[g]}
              </label>
              <input
                type="number"
                value={shipping[g] ?? ''}
                placeholder="—"
                onChange={e => setShipping(s => ({
                  ...s, [g]: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                }))}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593] transition-colors"
              />
              <button
                onClick={() => saveShipping(g)}
                disabled={saving === `ship-${g}`}
                className="mt-1.5 w-full py-1.5 rounded-lg bg-neutral-50 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors disabled:opacity-40"
              >
                {saved === `ship-${g}` ? 'Saved' : 'Save'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Models ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              Models <span className="text-gray-400 font-bold">({visible.length})</span>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Edit the factory cost and the landed price follows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Model, size, Hz…"
                className="pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-[#3D8593] w-48"
              />
            </div>
            <select
              value={String(sizeFilter)}
              onChange={e => setSizeFilter(e.target.value === 'all' ? 'all' : parseFloat(e.target.value))}
              className="py-2.5 px-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-[#3D8593]"
            >
              <option value="all">All sizes</option>
              {sizes.map(s => <option key={s} value={s}>{s}"</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-10 text-sm text-gray-400 font-light">Loading catalogue…</p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 font-light">
            Nothing here. If the catalogue is empty, run <code className="text-[#3D8593]">add_monitor_catalog.sql</code>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50/60">
                <tr>
                  {['Photo', 'Model', 'Spec', 'Factory USD', 'Landed KES', 'Colours', 'Image', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {visible.map(m => {
                  const std = optionsForModel(m, ports).find(o => o.isStandard);
                  const p = priceMonitor(m, settings, shipping, std);
                  return (
                    <tr key={m.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt="" className="w-12 h-9 object-contain rounded bg-neutral-50" />
                        ) : (
                          <div className="w-12 h-9 rounded bg-neutral-100" />
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-black text-gray-900">{displayCode(m)}</p>
                        <p className="text-[10px] font-bold text-gray-400">
                          {m.series || '—'}{m.curved ? ' · Curved' : ''} · {m.baseType} base
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-600">
                        {modelTitle(m)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={m.factoryUsd}
                          onChange={e => patchModel(m.id, { factoryUsd: parseFloat(e.target.value) || 0 })}
                          className="w-24 bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[#3D8593]"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.unitKES == null
                          ? <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900]">No freight</span>
                          : <span className="text-sm font-black text-gray-900">{money(p.unitKES)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={m.availableColors.join(', ')}
                          onChange={e => patchModel(m.id, {
                            availableColors: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                          })}
                          placeholder="Black, White"
                          title="Comma separated. Must match the labels in monitor_colors."
                          className="w-32 bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-[11px] font-bold text-gray-700 outline-none focus:border-[#3D8593]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {/* Pick a bundled photo, or paste any URL — a Cloudinary
                            link works exactly the same as a bundled path. */}
                        <div className="flex flex-col gap-1.5 min-w-[13rem]">
                          <select
                            value={STOCK_PHOTOS.includes(m.imageUrl || '') ? m.imageUrl : ''}
                            onChange={e => patchModel(m.id, { imageUrl: e.target.value })}
                            className="bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-2 text-[11px] font-bold text-gray-700 outline-none focus:border-[#3D8593]"
                          >
                            <option value="">— pick a photo —</option>
                            {STOCK_PHOTOS.map((src, i) => (
                              <option key={src} value={src}>Photo {i + 1}</option>
                            ))}
                          </select>
                          <input
                            value={m.imageUrl || ''}
                            onChange={e => patchModel(m.id, { imageUrl: e.target.value })}
                            placeholder="or paste a URL"
                            className="bg-neutral-50 border border-neutral-100 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-gray-600 outline-none focus:border-[#3D8593]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => saveModel(m)}
                          disabled={saving === m.id}
                          className="px-3.5 py-2 rounded-lg bg-[#3D8593] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#0f1a1c] transition-colors disabled:opacity-40"
                        >
                          {saved === m.id ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── The photo library, so the numbers above mean something ── */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-6">
        <h3 className="text-sm font-black text-gray-900 tracking-tight mb-1">Photo library</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
          Pulled from the supplier PDF · pick these by number above
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
          {STOCK_PHOTOS.map((src, i) => (
            <div key={src} className="text-center">
              <img src={src} alt={`Photo ${i + 1}`} className="w-full h-20 object-contain rounded-lg bg-neutral-50 border border-neutral-100" />
              <p className="text-[10px] font-black text-gray-400 mt-1.5">Photo {i + 1}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonitorsTab;
