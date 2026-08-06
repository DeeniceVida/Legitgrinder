import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, CircleNotch, Factory, Truck, ShieldCheck,
  SealCheck, ArrowLeft, Buildings, WarningCircle, WhatsappLogo, Cube,
  Receipt, FileXls, HardHat, Scales, ClipboardText
} from '@phosphor-icons/react';
import {
  CorporateCategory, fetchCorporateCategories, submitCorporateQuote, notifyCorporateQuote
} from '../services/corporate';
import { normalizeKenyanPhone } from '../utils/phone';
import { Reveal, CountUp } from '../components/Motion';
import ChairCatalog, { ChairOrder } from '../components/ChairCatalog';

/** The catalogue line these quantities belong to. */
const CHAIR_CATEGORY = 'Ergonomic Chairs';

const WHATSAPP = '254791873538';

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

/** Hard facts about how we trade — the strip under the hero. */
const TRADE_SPECS = [
  { Icon: Cube, label: 'Freight', value: 'Costed by CBM' },
  { Icon: Receipt, label: 'Duty & clearing', value: 'Included' },
  { Icon: Scales, label: 'Quoted in', value: 'Kenya Shillings' },
  { Icon: ClipboardText, label: 'Firm quote', value: '1 business day' },
];

/** Site-wide figures, kept identical to the Home stat bar. */
const STATS = [
  { end: 2000, suffix: '+', decimals: 0, label: 'Importers Served' },
  { end: 98.4, suffix: '%', decimals: 1, label: 'Fulfillment Rate' },
  { end: 40, suffix: '%', decimals: 0, label: 'Below Local Retail' },
  { end: 14, suffix: ' Days', decimals: 0, label: 'Avg Delivery Window' },
];

/** How a volume price is assembled — the same three parts, itemised. */
const PRICE_PARTS = [
  {
    Icon: Factory, n: '01', title: 'Factory unit cost',
    body: 'Negotiated at the source in USD and converted at the rate on your quote. No local distributor, no three layers of markup.',
  },
  {
    Icon: Truck, n: '02', title: 'Freight by volume',
    body: 'Every item is costed by its CBM, so a monitor and a shower set are never charged the same. Duty and clearing sit inside this figure.',
  },
  {
    Icon: ShieldCheck, n: '03', title: 'Procurement & handling',
    body: 'One percentage of goods value that tapers as your volume rises. Itemised on your quote — and it is the only fee we add.',
  },
];

const PROCESS = [
  { n: '01', title: 'Identify', body: 'Your name, company or project, and a working email. Two minutes, once.' },
  { n: '02', title: 'Build volumes', body: 'Pick your lines and set quantities against each one. Specifications, MOQ and freight are on the page.' },
  { n: '03', title: 'Firm quote', body: 'We confirm factory availability, production time and lead time, then issue a landed-cost quotation within one business day.' },
  { n: '04', title: 'Production to door', body: 'Sampling and pre-shipment inspection, freight, clearing, then delivery to your site.' },
];

const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

// Native dropdowns paint their popup from the element's own colours, so options
// are forced back to light — otherwise they render dark-on-dark.
const field =
  'w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3.5 text-sm font-medium text-white placeholder:text-white/30 outline-none focus:border-[#3D8593] transition-colors [&_option]:bg-white [&_option]:text-[#0f1a1c]';
const labelCls = 'block eyebrow text-white/40 mb-2';

/** Numbered section header with a hairline rule running off to the right. */
const SectionRule: React.FC<{ n: string; children: React.ReactNode }> = ({ n, children }) => (
  <div className="trade-rule mb-8">
    <span className="eyebrow text-[#FF9900] tnum">{n}</span>
    <span className="eyebrow text-white/70">{children}</span>
  </div>
);

const Corporate: React.FC = () => {
  const [categories, setCategories] = useState<CorporateCategory[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  /** What they configured in the chair catalogue. */
  const [chairOrder, setChairOrder] = useState<ChairOrder | null>(null);
  /** How many chair models exist. Zero before the migration is run. */
  const [chairCount, setChairCount] = useState(0);
  /** Prices unlock once they have told us who they are — specs never lock. */
  const [identified, setIdentified] = useState(false);

  // Step 1 — who they are
  const [buyerType, setBuyerType] = useState<'business' | 'project'>('business');
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

  /** Chairs configured in the catalogue count as a line, and carry their own
   *  quantity — so neither has to be re-entered in the form. */
  const chairQty = chairOrder?.lines.reduce((n, l) => n + l.qty, 0) || 0;
  const hasChairs = chairQty > 0;

  // A category is required only when there are categories to choose from — if
  // none are configured yet, the specifications box carries the request.
  const step2Valid = (picked.length > 0 || hasChairs || (catsLoaded && categories.length === 0))
    && (!!qtyBand || hasChairs) && !!timeline;

  const chosen = useMemo(() => categories.filter(c => picked.includes(c.name)), [categories, picked]);
  const band = QTY_BANDS.find(b => b.id === qtyBand);

  /** The band their configured schedule falls into, when they used the catalogue. */
  const effectiveBand = hasChairs
    ? (chairQty >= 50 ? '50+' : chairQty >= 25 ? '25-50' : chairQty >= 10 ? '10-25' : '5-10')
    : qtyBand;

  /** Highest MOQ among what they picked — the real "worth my time" threshold. */
  const requiredMoq = chosen.length ? Math.max(...chosen.map(c => c.moq || 0)) : 0;
  const belowMoq = hasChairs
    ? requiredMoq > 0 && chairQty < requiredMoq
    : !!band && requiredMoq > 0 && band.high < requiredMoq;

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
  const scrollToCatalog = () => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async () => {
    if (!step2Valid || submitting) return;
    setSubmitting(true);
    setError(null);

    // A configured schedule implies the chair line even if they never ticked it.
    const categoriesOut = hasChairs && !picked.includes(CHAIR_CATEGORY)
      ? [...picked, CHAIR_CATEGORY]
      : picked;

    // A priced schedule is an exact figure, so it beats the category band.
    const exact = chairOrder?.priced ? chairOrder.totalKES : undefined;

    const payload = {
      fullName, businessName, email,
      whatsapp: whatsapp.trim() ? normalizeKenyanPhone(whatsapp) : undefined,
      location: location.trim() || undefined,
      categories: categoriesOut,
      quantityBand: effectiveBand || undefined,
      budgetBand: budget || undefined,
      timeline,
      notes: notes.trim() || undefined,
      buyerType,
      lineItems: chairOrder?.lines.map(l => ({
        code: l.modelCode, name: l.name, color: l.color, qty: l.qty, unitKES: l.unitKES,
      })),
      estimateLow: exact ?? estimate?.totalLow,
      estimateHigh: exact ?? estimate?.totalHigh,
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

  const orgLabel = buyerType === 'business' ? 'Business name' : 'Project name';

  return (
    <div className="min-h-screen bg-[#0f1a1c] text-white">
      {/* ---------------- TRADE BAR ---------------- */}
      <div className="sticky top-0 z-30 bg-[#0f1a1c]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 eyebrow text-white/50 hover:text-[#FF9900] transition-colors shrink-0">
            <ArrowLeft size={13} weight="bold" />
            <span className="hidden sm:inline">LegitGrinder</span> Trade
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#3D8593] text-[#7fc2ce] text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] hover:text-white transition-colors shrink-0"
          >
            <WhatsappLogo size={15} weight="fill" /> Talk to procurement
          </a>
        </div>
      </div>

      {/* ---------------- HERO ---------------- */}
      <header className="relative overflow-hidden bg-blueprint border-b border-white/10">
        <div className="relative max-w-6xl mx-auto px-5 md:px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <p className="eyebrow text-white/70 mb-7 flex items-center gap-3.5 flex-wrap">
            <span className="h-px w-10 bg-[#FF9900]" aria-hidden="true"></span>
            <Buildings size={14} weight="duotone" className="text-[#7fc2ce]" />
            Bulk Procurement · Nairobi
          </p>

          <h1 className="font-black uppercase tracking-tighter leading-[0.92] max-w-4xl mb-7 text-[2.6rem] sm:text-6xl md:text-7xl">
            Buy at factory<br />
            <span className="text-[#7fc2ce]">volume.</span> Land it<br />
            at your site.
          </h1>

          <p className="text-base md:text-lg text-white/70 font-light leading-relaxed max-w-xl mb-9">
            Direct-from-factory sourcing for offices, developments and fit-out projects —
            costed per unit, freighted by volume, cleared and delivered as one landed figure.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5">
            <button
              onClick={scrollToForm}
              className="btn-vibrant-orange shine inline-flex items-center justify-center gap-3 px-9 py-4.5 rounded-full font-black uppercase text-[11px] tracking-widest"
            >
              Start a bulk quote <ArrowRight size={16} weight="bold" />
            </button>
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 border border-white/25 text-white px-9 py-4.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-[#0f1a1c] transition-colors"
            >
              <WhatsappLogo size={17} weight="fill" /> WhatsApp us
            </a>
          </div>
        </div>

        {/* Trade spec strip */}
        <div className="relative border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 md:px-6 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10">
            {TRADE_SPECS.map(({ Icon, label, value }) => (
              <div key={label} className="px-4 py-5 md:px-6 md:py-6 first:pl-0 lg:last:pr-0">
                <Icon size={17} weight="duotone" className="text-[#7fc2ce] mb-3" />
                <p className="eyebrow text-white/40 mb-1.5">{label}</p>
                <p className="text-sm font-bold tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stat bar — counts up on view */}
        <div className="relative border-t border-white/10 bg-black/20">
          <div className="max-w-6xl mx-auto px-5 md:px-6 py-7 grid grid-cols-2 lg:grid-cols-4 gap-y-7 gap-x-6">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <CountUp
                  end={s.end}
                  suffix={s.suffix}
                  decimals={s.decimals}
                  className="tnum text-3xl md:text-4xl font-black tracking-tighter text-white"
                />
                <span className="eyebrow text-[#FF9900] mt-2">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------------- 01 · HOW VOLUME PRICING WORKS ---------------- */}
      <section className="max-w-6xl mx-auto px-5 md:px-6 pt-16 md:pt-20">
        <SectionRule n="01">How a volume price is built</SectionRule>
        <div className="grid md:grid-cols-3 border-t border-white/10">
          {PRICE_PARTS.map(({ Icon, n, title, body }, i) => (
            <Reveal key={title} delay={i * 100}>
              <div className="h-full p-6 md:p-7 border-b md:border-r border-white/10 md:last:border-r-0">
                <div className="flex items-center justify-between mb-6">
                  <Icon size={24} weight="duotone" className="text-[#7fc2ce]" />
                  <span className="tnum eyebrow text-white/20 text-base">{n}</span>
                </div>
                <h3 className="text-base font-bold mb-2.5">{title}</h3>
                <p className="text-sm text-white/60 font-light leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-sm text-white/50 font-light leading-relaxed mt-6 max-w-2xl">
          Add the three together and that is your total landed cost — the figure you pay, with nothing waiting
          for you at the port.
        </p>
      </section>

      {/* ---------------- 02 · THE COMPARISON ---------------- */}
      <section className="max-w-6xl mx-auto px-5 md:px-6 pt-16 md:pt-20">
        <SectionRule n="02">Why volume changes the maths</SectionRule>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { tag: 'Local retail', body: 'What the same specification costs you from a Nairobi dealer, after their import cost, their margin and their showroom.' },
            { tag: 'Single unit, imported', body: 'Buying one piece through our retail shop. Fair, but one unit carries its own freight and its own clearing.' },
            { tag: 'Your volume price', body: 'One consignment, one clearing, freight spread across every unit. This is the column that makes importing through us worth it.' },
          ].map(({ tag, body }, i) => (
            <Reveal key={tag} delay={i * 100}>
              <div className={`h-full rounded-xl p-6 border ${i === 2 ? 'border-[#FF9900]/40 bg-[#FF9900]/[0.07]' : 'border-white/10 bg-white/[0.02]'}`}>
                <p className={`eyebrow mb-3 ${i === 2 ? 'text-[#FF9900]' : 'text-white/40'}`}>{tag}</p>
                <p className="text-sm text-white/65 font-light leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-sm text-white/50 font-light leading-relaxed mt-6 max-w-2xl">
          Your quotation sets all three side by side, so the saving is a figure you can check against your own
          suppliers — not a claim you have to take on trust.
        </p>
      </section>

      {/* ---------------- 03 · WHAT WE SOURCE ---------------- */}
      <section className="max-w-6xl mx-auto px-5 md:px-6 pt-16 md:pt-20">
        <SectionRule n="03">What we source</SectionRule>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 70}>
              <div className="h-full rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#3D8593]/60 transition-colors">
                <h3 className="text-base font-bold mb-2">{c.name}</h3>
                {c.blurb && <p className="text-sm text-white/55 font-light leading-relaxed mb-4">{c.blurb}</p>}
                {c.moq > 0 && (
                  <p className="tnum eyebrow text-[#7fc2ce] pt-3 border-t border-white/10">Min order · {c.moq} units</p>
                )}
              </div>
            </Reveal>
          ))}

          {/* The all-in-one route — anything not on the list */}
          <Reveal delay={categories.length * 70}>
            <div className="h-full rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6">
              <FileXls size={24} weight="duotone" className="text-[#FF9900] mb-4" />
              <h3 className="text-base font-bold mb-2">Not on the list?</h3>
              <p className="text-sm text-white/55 font-light leading-relaxed mb-4">
                Send us your own schedule — item, quantity and your target price per unit — and we will source
                against it. Forty lines is as easy as one.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:text-white transition-colors"
              >
                Send your schedule <ArrowRight size={13} weight="bold" />
              </a>
            </div>
          </Reveal>
        </div>
        <p className="text-sm text-white/50 font-light leading-relaxed mt-6 max-w-2xl">
          Nothing here is held in stock — every line is sourced to your order, which is exactly why the price
          works at volume.
        </p>
      </section>

      {/* ---------------- 04 · THE ERGONOMIC CHAIR CATALOGUE ---------------- */}
      {/* Heading and copy are hidden along with the grid when the catalogue is
          empty — a headline standing over nothing reads as a broken page. */}
      <section
        ref={catalogRef}
        className={`max-w-6xl mx-auto px-5 md:px-6 pt-16 md:pt-20 scroll-mt-16 ${chairCount > 0 ? '' : 'hidden'}`}
      >
        <SectionRule n="04">Ergonomic chairs</SectionRule>
        <p className="text-sm text-white/55 font-light leading-relaxed max-w-2xl mb-8">
          {chairCount} models, mesh and sponge, all sourced to order. Set a quantity against each one and your
          schedule builds itself — carton volume and minimums are on every card, because that is what freight
          is actually charged on.
        </p>
        <ChairCatalog
          identified={identified}
          onUnlock={scrollToForm}
          onChange={setChairOrder}
          onReady={setChairCount}
        />
      </section>

      {/* ---------------- 05 · THE PROCESS ---------------- */}
      <section className="max-w-6xl mx-auto px-5 md:px-6 pt-16 md:pt-20">
        <SectionRule n="05">How it runs</SectionRule>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-white/10">
          {PROCESS.map(({ n, title, body }, i) => (
            <Reveal key={n} delay={i * 90}>
              <div className="h-full p-6 border-b lg:border-r border-white/10 lg:last:border-r-0">
                <span className="tnum text-2xl font-black tracking-tighter text-[#FF9900]">{n}</span>
                <h3 className="text-base font-bold mt-4 mb-2">{title}</h3>
                <p className="text-sm text-white/60 font-light leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- QUOTE FORM ---------------- */}
      <section ref={formRef} className="max-w-2xl mx-auto px-5 md:px-6 pt-16 md:pt-20 pb-24 scroll-mt-16">
        <SectionRule n="06">Request your quote</SectionRule>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {done ? (
            <div className="p-8 md:p-14 text-center">
              <SealCheck size={52} weight="fill" className="text-[#FF9900] mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3">We have your brief.</h2>
              <p className="text-white/60 font-light leading-relaxed max-w-md mx-auto mb-8">
                {leadQuality === 'low'
                  ? 'We’ve sent our indicative pricing to your inbox. When you’re ready to move on volumes, reply to that email and we’ll prepare a formal landed-cost quotation.'
                  : 'Our procurement team will confirm factory availability and lead times, then issue a formal landed-cost quotation within one business day. A confirmation is already in your inbox.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-5">
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#7fc2ce] hover:text-white transition-colors"
                >
                  <WhatsappLogo size={15} weight="fill" /> Add detail on WhatsApp
                </a>
                <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF9900] transition-colors">
                  Back to LegitGrinder <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3 px-6 md:px-8 pt-6">
                {[1, 2].map(n => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${step >= n ? 'bg-[#FF9900]' : 'bg-white/15'}`} />
                ))}
              </div>

              <div className="p-6 md:p-8">
                <p className="tnum eyebrow text-[#7fc2ce] mb-2">Step {step} of 2</p>
                <h2 className="text-xl md:text-2xl font-bold mb-7">
                  {step === 1 ? 'Who are we quoting for?' : 'What do you need?'}
                </h2>

                {error && (
                  <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 mb-6">
                    <WarningCircle size={18} weight="duotone" className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-200">{error}</p>
                  </div>
                )}

                {step === 1 ? (
                  <div className="space-y-5">
                    {/* Business or personal project — a KRA PIN would only insult
                        someone furnishing their own house. */}
                    <div>
                      <span className={labelCls}>Buying for</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {([
                          { id: 'business', label: 'A business', Icon: Buildings },
                          { id: 'project', label: 'A project', Icon: HardHat },
                        ] as const).map(({ id, label, Icon }) => {
                          const on = buyerType === id;
                          return (
                            <button
                              key={id}
                              onClick={() => setBuyerType(id)}
                              aria-pressed={on}
                              className={`flex items-center gap-2.5 rounded-lg border px-4 py-3.5 text-sm font-bold transition-all ${on ? 'border-[#3D8593] bg-[#3D8593]/15 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                            >
                              <Icon size={18} weight="duotone" className={on ? 'text-[#7fc2ce]' : 'text-white/40'} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-name">Full name *</label>
                        <input id="c-name" className={field} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Mwangi" />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="c-biz">{orgLabel} *</label>
                        <input id="c-biz" className={field} value={businessName} onChange={e => setBusinessName(e.target.value)}
                          placeholder={buyerType === 'business' ? 'Acme Ltd' : 'Riverside Apartments'} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-email">Email *</label>
                        <input id="c-email" type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@acme.co.ke" />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="c-wa">WhatsApp</label>
                        <input id="c-wa" className={field} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="07… or 254…" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="c-loc">Delivery site</label>
                      <input id="c-loc" className={field} value={location} onChange={e => setLocation(e.target.value)} placeholder="Westlands, Nairobi" />
                    </div>

                    <button
                      onClick={() => { setIdentified(true); setStep(2); }}
                      disabled={!step1Valid}
                      className="btn-vibrant-orange w-full mt-2 py-4 rounded-full font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Continue <ArrowRight size={14} weight="bold" />
                    </button>
                    <p className="text-[11px] text-white/40 font-medium text-center">
                      No KRA PIN, no paperwork. Your details stay private — we quote, we don’t market at you.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-7">
                    {/* What they built in the catalogue rides along with the brief */}
                    {hasChairs ? (
                      <div className="rounded-lg border border-[#FF9900]/35 bg-[#FF9900]/[0.07] p-4">
                        <p className="eyebrow text-[#FF9900] mb-2.5">Your chair schedule</p>
                        <p className="tnum text-sm text-white/75 font-light leading-relaxed">
                          <strong className="font-bold text-white">{chairQty} chairs</strong> across{' '}
                          {chairOrder!.lines.length} model{chairOrder!.lines.length === 1 ? '' : 's'}
                          {chairOrder!.priced && <> · {money(chairOrder!.totalKES)} landed</>}
                        </p>
                        <button
                          onClick={scrollToCatalog}
                          className="mt-2.5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF9900] transition-colors"
                        >
                          Edit the schedule <ArrowRight size={12} weight="bold" />
                        </button>
                      </div>
                    ) : chairCount > 0 ? (
                      <button
                        onClick={scrollToCatalog}
                        className="w-full text-left rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-4 hover:border-[#3D8593]/60 transition-colors"
                      >
                        <p className="text-sm font-bold mb-1">Need chairs? Build the schedule.</p>
                        <p className="text-xs text-white/50 font-light leading-relaxed">
                          {chairCount} ergonomic models are priced on this page — set quantities and they come
                          through with your brief.
                        </p>
                      </button>
                    ) : null}

                    {/* Categories */}
                    <div>
                      <span className={labelCls}>What are you sourcing? *</span>
                      <div className="space-y-2.5">
                        {!catsLoaded && (
                          <p className="text-sm text-white/40 font-light">Loading lines…</p>
                        )}
                        {catsLoaded && categories.length === 0 && (
                          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-sm text-white/60 font-light leading-relaxed">
                              Tell us what you need in the specifications box below and we’ll quote it — or{' '}
                              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="underline decoration-[#FF9900]/60 hover:text-[#FF9900] transition-colors">message us directly</a>.
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
                              className={`w-full text-left flex items-start gap-3.5 rounded-lg border p-4 transition-all ${on ? 'border-[#3D8593] bg-[#3D8593]/15' : 'border-white/10 hover:border-white/30'}`}
                            >
                              <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-[#3D8593] border-[#3D8593]' : 'border-white/25'}`}>
                                {on && <CheckCircle size={14} weight="fill" className="text-white" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-bold">{c.name}</span>
                                {c.blurb && <span className="block text-xs text-white/55 font-light mt-0.5">{c.blurb}</span>}
                                {c.moq > 0 && <span className="block tnum eyebrow text-[#FF9900] mt-1.5">Min {c.moq} units</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-qty">
                          {hasChairs ? 'Quantity beyond the chairs' : 'Estimated quantity *'}
                        </label>
                        <select id="c-qty" className={field} value={qtyBand} onChange={e => setQtyBand(e.target.value)}>
                          <option value="">{hasChairs ? 'Chairs only' : 'Select…'}</option>
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
                      <div className="flex items-start gap-3 bg-[#FF9900]/10 border border-[#FF9900]/30 rounded-lg p-4">
                        <WarningCircle size={18} weight="duotone" className="text-[#FF9900] shrink-0 mt-0.5" />
                        <p className="text-sm text-white/70 font-light leading-relaxed">
                          Our minimum for this line is <strong className="tnum font-bold text-[#FF9900]">{requiredMoq} units</strong>. You’re welcome to
                          submit — we’ll send indicative pricing — but smaller orders are usually better served through our{' '}
                          <Link to="/shop" className="underline decoration-[#FF9900]/60 hover:text-[#FF9900] transition-colors">retail shop</Link>.
                        </p>
                      </div>
                    )}

                    {/* Indicative landed cost — only from categories you've priced */}
                    {estimate && (
                      <div className="rounded-xl border border-[#3D8593]/40 bg-[#3D8593]/10 p-6">
                        <p className="eyebrow text-[#7fc2ce] mb-4">Indicative landed cost</p>
                        <div className="space-y-2.5 mb-5">
                          {estimate.priced.map(c => (
                            <div key={c.id} className="flex justify-between items-baseline gap-4 text-sm">
                              <span className="text-white/60 font-light">{c.name}</span>
                              <span className="tnum font-bold whitespace-nowrap">{money(c.minKES!)} – {money(c.maxKES!)}<span className="text-white/45 font-medium text-xs"> /unit</span></span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-baseline gap-4 pt-4 border-t border-white/10">
                          <span className="eyebrow text-white/60">Order value</span>
                          <span className="tnum text-lg font-black tracking-tight text-[#FF9900]">{money(estimate.totalLow)} – {money(estimate.totalHigh)}</span>
                        </div>
                        <p className="text-[11px] text-white/45 font-light leading-relaxed mt-4">
                          Landed to Nairobi, inclusive of freight and clearing. Indicative only — your formal quotation confirms
                          the exact mix, specification and final figure.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className={labelCls} htmlFor="c-notes">Specifications, schedule or branding</label>
                      <textarea id="c-notes" rows={4} className={`${field} resize-none`} value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Models, sizes, colours, logo branding, site deadlines — or paste your schedule here." />
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)}
                        className="px-6 py-4 rounded-full border border-white/15 text-white/60 font-black uppercase text-[11px] tracking-widest hover:border-[#3D8593] hover:text-white transition-colors">
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!step2Valid || submitting}
                        className="btn-vibrant-orange flex-1 py-4 rounded-full font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? <><CircleNotch size={15} className="animate-spin" /> Sending…</> : <>Request landed-cost quote <ArrowRight size={14} weight="bold" /></>}
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
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-10 flex flex-wrap items-center justify-between gap-5">
          <p className="text-xs text-white/40 font-medium">LegitGrinder Trade · Direct-from-factory procurement · Nairobi</p>
          <div className="flex items-center gap-6">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-[#FF9900] transition-colors">
              <WhatsappLogo size={14} weight="fill" /> WhatsApp
            </a>
            <Link to="/" className="text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-[#FF9900] transition-colors">Home</Link>
            <Link to="/consultation" className="text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-[#FF9900] transition-colors">Consultation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Corporate;
