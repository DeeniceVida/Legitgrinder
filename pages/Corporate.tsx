import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, CircleNotch, Factory, Truck, ShieldCheck,
  SealCheck, ArrowLeft, Buildings, WarningCircle
} from '@phosphor-icons/react';
import {
  CorporateCategory, fetchCorporateCategories, submitCorporateQuote, notifyCorporateQuote
} from '../services/corporate';
import { normalizeKenyanPhone } from '../utils/phone';

const QTY_BANDS = [
  { id: '5-10', label: '5 – 10 units', low: 5, high: 10 },
  { id: '10-25', label: '10 – 25 units', low: 10, high: 25 },
  { id: '25-50', label: '25 – 50 units', low: 25, high: 50 },
  { id: '50+', label: '50+ units', low: 50, high: 50 },
];

const BUDGET_BANDS = ['Under KES 500,000', 'KES 500,000 – 2M', 'KES 2M – 5M', 'Over KES 5M', 'Not yet defined'];

const TIMELINES = [
  { id: 'immediate', label: 'Immediate — buying now' },
  { id: '30days', label: 'Within 30 days' },
  { id: '1-3months', label: '1 – 3 months' },
  { id: 'researching', label: 'Just researching' },
];

const VALUE_PROPS = [
  { Icon: Factory, title: 'Factory-Direct Pricing', body: 'Up to 40% below local retail markups — you buy at the source, not through three middlemen.' },
  { Icon: Truck, title: 'End-to-End Logistics', body: 'Freight, customs clearing, KRA compliance and door-to-door delivery, handled as one line item.' },
  { Icon: ShieldCheck, title: 'Quality Assured', body: 'Factory sampling and pre-shipment inspection before anything is paid for or loaded.' },
];

const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

const field =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder:text-slate-500 outline-none focus:border-slate-400 transition-colors';
const labelCls = 'block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2';

const Corporate: React.FC = () => {
  const [categories, setCategories] = useState<CorporateCategory[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Step 1 — who they are
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');

  // Step 2 — what they need
  const [picked, setPicked] = useState<string[]>([]);
  const [qtyBand, setQtyBand] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [notes, setNotes] = useState('');

  const [catsLoaded, setCatsLoaded] = useState(false);
  useEffect(() => {
    fetchCorporateCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCatsLoaded(true));
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const step1Valid = !!fullName.trim() && !!businessName.trim() && emailValid;
  // A category is required only when there are categories to choose from — if
  // none are configured yet, the specifications box carries the request.
  const step2Valid = (picked.length > 0 || (catsLoaded && categories.length === 0))
    && !!qtyBand && !!timeline;

  const chosen = useMemo(() => categories.filter(c => picked.includes(c.name)), [categories, picked]);
  const band = QTY_BANDS.find(b => b.id === qtyBand);

  /** Highest MOQ among what they picked — the real "worth my time" threshold. */
  const requiredMoq = chosen.length ? Math.max(...chosen.map(c => c.moq || 0)) : 0;
  const belowMoq = !!band && requiredMoq > 0 && band.high < requiredMoq;

  /** Indicative landed range — only from categories you've actually priced. */
  const estimate = useMemo(() => {
    const priced = chosen.filter(c => (c.minKES || 0) > 0 && (c.maxKES || 0) > 0);
    if (!priced.length || !band) return null;
    const low = Math.min(...priced.map(c => c.minKES!));
    const high = Math.max(...priced.map(c => c.maxKES!));
    return { priced, unitLow: low, unitHigh: high, totalLow: low * band.low, totalHigh: high * band.high };
  }, [chosen, band]);

  // Researchers and below-minimum enquiries are logged but never interrupt you.
  const leadQuality: 'priority' | 'low' = (timeline === 'researching' || belowMoq) ? 'low' : 'priority';

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async () => {
    if (!step2Valid || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      fullName, businessName, email,
      whatsapp: whatsapp.trim() ? normalizeKenyanPhone(whatsapp) : undefined,
      location: location.trim() || undefined,
      categories: picked,
      quantityBand: qtyBand,
      budgetBand: budget || undefined,
      timeline,
      notes: notes.trim() || undefined,
      estimateLow: estimate?.totalLow,
      estimateHigh: estimate?.totalHigh,
      leadQuality,
    };

    const res = await submitCorporateQuote(payload);
    if (!res.success) { setSubmitting(false); setError(res.error || 'Could not submit your request.'); return; }

    // Emails are best-effort — the request is already safely recorded.
    notifyCorporateQuote({ ...payload, shopUrl: `${window.location.origin}/shop` }).catch(() => {});
    setSubmitting(false);
    setDone(true);
  };

  const toggle = (name: string) =>
    setPicked(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ---------------- HERO ---------------- */}
      <header className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute -top-40 -right-32 w-[32rem] h-[32rem] bg-slate-700/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300 transition-colors mb-12">
            <ArrowLeft size={13} weight="bold" /> LegitGrinder
          </Link>

          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-7">
            <Buildings size={13} weight="duotone" /> Corporate Procurement
          </span>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] max-w-4xl mb-6">
            Direct-from-Factory Procurement for High-Performance Workspaces.
          </h1>
          <p className="text-base md:text-lg text-slate-400 font-light leading-relaxed max-w-2xl mb-10">
            We source, inspect and ship bulk office equipment — ergonomic seating, standing desks and monitors — directly
            to your business, with guaranteed landed costs.
          </p>

          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2.5 bg-white text-slate-950 px-8 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-colors active:scale-95"
          >
            Request a Bulk Quote <ArrowRight size={15} weight="bold" />
          </button>
        </div>
      </header>

      {/* ---------------- VALUE PROPS ---------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid md:grid-cols-3 gap-5">
        {VALUE_PROPS.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-7">
            <Icon size={24} weight="duotone" className="text-slate-400 mb-5" />
            <h3 className="text-base font-bold mb-2.5">{title}</h3>
            <p className="text-sm text-slate-400 font-light leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      {/* ---------------- QUOTE FORM ---------------- */}
      <section ref={formRef} className="max-w-2xl mx-auto px-6 pb-24 scroll-mt-8">
        <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 overflow-hidden">
          {done ? (
            <div className="p-10 md:p-14 text-center">
              <SealCheck size={52} weight="fill" className="text-emerald-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3">Thank you — we have your brief.</h2>
              <p className="text-slate-400 font-light leading-relaxed max-w-md mx-auto mb-8">
                {leadQuality === 'low'
                  ? 'We’ve sent our indicative pricing to your inbox. When you’re ready to move on volumes, reply to that email and we’ll prepare a formal landed-cost quotation.'
                  : 'Our procurement team will review your specifications and issue a formal landed-cost quotation within one business day. A confirmation is already in your inbox.'}
              </p>
              <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                Back to LegitGrinder <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3 px-7 md:px-9 pt-7">
                {[1, 2].map(n => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${step >= n ? 'bg-white' : 'bg-slate-700'}`} />
                ))}
              </div>

              <div className="p-7 md:p-9">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1.5">Step {step} of 2</p>
                <h2 className="text-xl md:text-2xl font-bold mb-7">
                  {step === 1 ? 'Who are we quoting for?' : 'What do you need?'}
                </h2>

                {error && (
                  <div className="flex items-start gap-3 bg-rose-950/40 border border-rose-900 rounded-xl p-4 mb-6">
                    <WarningCircle size={18} weight="duotone" className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-200">{error}</p>
                  </div>
                )}

                {step === 1 ? (
                  <div className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-name">Full name *</label>
                        <input id="c-name" className={field} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Mwangi" />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="c-biz">Business name *</label>
                        <input id="c-biz" className={field} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Ltd" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-email">Work email *</label>
                        <input id="c-email" type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@acme.co.ke" />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="c-wa">WhatsApp</label>
                        <input id="c-wa" className={field} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="07… or 254…" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="c-loc">Delivery location</label>
                      <input id="c-loc" className={field} value={location} onChange={e => setLocation(e.target.value)} placeholder="Westlands, Nairobi" />
                    </div>

                    <button
                      onClick={() => setStep(2)}
                      disabled={!step1Valid}
                      className="w-full mt-2 py-4 rounded-full bg-white text-slate-950 font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Continue <ArrowRight size={14} weight="bold" />
                    </button>
                    <p className="text-[11px] text-slate-500 font-medium text-center">
                      Your details stay private — we quote, we don’t market at you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-7">
                    {/* Categories */}
                    <div>
                      <span className={labelCls}>What are you sourcing? *</span>
                      <div className="space-y-2.5">
                        {!catsLoaded && (
                          <p className="text-sm text-slate-500 font-light">Loading categories…</p>
                        )}
                        {catsLoaded && categories.length === 0 && (
                          <div className="rounded-xl border border-slate-700 p-4">
                            <p className="text-sm text-slate-400 font-light leading-relaxed">
                              Tell us what you need in the specifications box below and we’ll quote it — or{' '}
                              <a href={`https://wa.me/254791873538`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">message us directly</a>.
                            </p>
                          </div>
                        )}
                        {categories.map(c => {
                          const on = picked.includes(c.name);
                          return (
                            <button
                              key={c.id}
                              onClick={() => toggle(c.name)}
                              aria-pressed={on}
                              className={`w-full text-left flex items-start gap-3.5 rounded-xl border p-4 transition-all ${on ? 'border-white bg-slate-800' : 'border-slate-700 hover:border-slate-500'}`}
                            >
                              <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? 'bg-white border-white' : 'border-slate-600'}`}>
                                {on && <CheckCircle size={14} weight="fill" className="text-slate-950" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-bold">{c.name}</span>
                                {c.blurb && <span className="block text-xs text-slate-400 font-light mt-0.5">{c.blurb}</span>}
                                {c.moq > 0 && <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1.5">Min {c.moq} units</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-qty">Estimated quantity *</label>
                        <select id="c-qty" className={field} value={qtyBand} onChange={e => setQtyBand(e.target.value)}>
                          <option value="">Select…</option>
                          {QTY_BANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="c-time">Timeline *</label>
                        <select id="c-time" className={field} value={timeline} onChange={e => setTimeline(e.target.value)}>
                          <option value="">Select…</option>
                          {TIMELINES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls} htmlFor="c-budget">Indicative budget</label>
                      <select id="c-budget" className={field} value={budget} onChange={e => setBudget(e.target.value)}>
                        <option value="">Prefer not to say</option>
                        {BUDGET_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    {/* Below-minimum notice — honest, not a dead end */}
                    {belowMoq && (
                      <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-900/60 rounded-xl p-4">
                        <WarningCircle size={18} weight="duotone" className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-100/80 font-light leading-relaxed">
                          Our minimum for this line is <strong className="text-amber-200">{requiredMoq} units</strong>. You’re welcome to
                          submit — we’ll send indicative pricing — but smaller orders are usually better served through our{' '}
                          <Link to="/shop" className="underline hover:text-white">retail shop</Link>.
                        </p>
                      </div>
                    )}

                    {/* Indicative landed cost — only from categories you've priced */}
                    {estimate && (
                      <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Indicative landed cost</p>
                        <div className="space-y-2.5 mb-5">
                          {estimate.priced.map(c => (
                            <div key={c.id} className="flex justify-between items-baseline gap-4 text-sm">
                              <span className="text-slate-400 font-light">{c.name}</span>
                              <span className="font-bold whitespace-nowrap">{money(c.minKES!)} – {money(c.maxKES!)}<span className="text-slate-500 font-medium text-xs"> /unit</span></span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-baseline gap-4 pt-4 border-t border-slate-800">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Order value</span>
                          <span className="text-lg font-black">{money(estimate.totalLow)} – {money(estimate.totalHigh)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-light leading-relaxed mt-4">
                          Landed to Nairobi, inclusive of freight and clearing. Indicative only — your formal quotation confirms
                          the exact mix, specification and final figure.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className={labelCls} htmlFor="c-notes">Specifications or custom branding</label>
                      <textarea id="c-notes" rows={4} className={`${field} resize-none`} value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Model preferences, colours, logo/branding, delivery deadlines…" />
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)}
                        className="px-6 py-4 rounded-full border border-slate-700 text-slate-400 font-black uppercase text-[11px] tracking-widest hover:border-slate-500 hover:text-white transition-colors">
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!step2Valid || submitting}
                        className="flex-1 py-4 rounded-full bg-white text-slate-950 font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? <><CircleNotch size={15} className="animate-spin" /> Sending…</> : <>Get Landed Cost Estimate <ArrowRight size={14} weight="bold" /></>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-5">
          <p className="text-xs text-slate-500 font-medium">LegitGrinder · Direct-from-factory procurement · Nairobi</p>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Home</Link>
            <Link to="/consultation" className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Book a consultation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Corporate;
