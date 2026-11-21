import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CircleNotch, Factory, Truck, ShieldCheck,
  SealCheck, ArrowLeft, Buildings, WarningCircle, WhatsappLogo, Cube,
  Receipt, HardHat, Scales, ClipboardText
} from '@phosphor-icons/react';
import { submitCorporateQuote, notifyCorporateQuote } from '../services/corporate';
import { normalizeKenyanPhone } from '../utils/phone';
import { Reveal, CountUp } from '../components/Motion';

/**
 * /corporate — bulk sourcing, by brief.
 *
 * It used to list what we source, with a fourteen-model chair catalogue and an
 * instant estimate. That came off on 2026-11-21: the goods are the same ones
 * sold as singles, only quoted by the dozen, so a separate catalogue was a
 * second list to keep true and it said less than a sentence from the buyer
 * would. What a volume buyer actually needs is a way to say what they want and
 * how many — and a figure back within a day.
 *
 * The chair pricing is untouched in Admin → Chairs, so the catalogue can be
 * brought back if he ever wants it.
 */

const WHATSAPP = '254791873538';

const QTY_BANDS = [
  { id: '5-10', label: '5 – 10 units' },
  { id: '10-25', label: '10 – 25 units' },
  { id: '25-50', label: '25 – 50 units' },
  { id: '50+', label: '50+ units' },
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
  { n: '01', title: 'Send the brief', body: 'What you need and roughly how many. Models and specifications if you have them, a description if you don’t.' },
  { n: '02', title: 'We source it', body: 'We find it at the factory, confirm availability, production time and carton volume.' },
  { n: '03', title: 'Firm quote', body: 'A landed-cost quotation within one business day — goods, freight, clearing and our fee, itemised.' },
  { n: '04', title: 'Production to door', body: 'Sampling and pre-shipment inspection, freight, clearing, then delivery to your site.' },
];

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
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Step 1 — who they are
  const [buyerType, setBuyerType] = useState<'business' | 'project'>('business');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');

  // Step 2 — what they need. No list to tick: the goods are the same ones we
  // sell as singles, so what matters is what THEY want and how many.
  const [needs, setNeeds] = useState('');
  const [qtyBand, setQtyBand] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const step1Valid = !!fullName.trim() && !!businessName.trim() && emailValid;
  const step2Valid = needs.trim().length > 3 && !!qtyBand && !!timeline;

  // Researchers are logged but never interrupt him.
  const leadQuality: 'priority' | 'low' = timeline === 'researching' ? 'low' : 'priority';

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async () => {
    if (!step2Valid || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      fullName, businessName, email,
      whatsapp: whatsapp.trim() ? normalizeKenyanPhone(whatsapp) : undefined,
      location: location.trim() || undefined,
      // Their own words are the brief now. Kept as a category too, so the
      // dashboard's list of what people ask for still fills itself in.
      categories: [needs.trim().slice(0, 80)],
      quantityBand: qtyBand || undefined,
      budgetBand: budget || undefined,
      timeline,
      notes: needs.trim(),
      buyerType,
      leadQuality,
    };

    const res = await submitCorporateQuote(payload);
    if (!res.success) { setSubmitting(false); setError(res.error || 'Could not submit your request.'); return; }

    // Emails are best-effort — the request is already safely recorded.
    notifyCorporateQuote({ ...payload, shopUrl: `${window.location.origin}/shop` }).catch(() => {});
    setSubmitting(false);
    setDone(true);
  };

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
            Tell us what<br />
            <span className="text-[#7fc2ce]">you need.</span> We land<br />
            it at your site.
          </h1>

          <p className="text-base md:text-lg text-white/70 font-light leading-relaxed max-w-xl mb-9">
            Anything we sell as a single, we source by the dozen — and most of what we source
            was never on a list to begin with. Send the brief; a landed-cost quote follows
            within one business day.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5">
            <button
              onClick={scrollToForm}
              className="btn-vibrant-orange shine inline-flex items-center justify-center gap-3 px-9 py-4.5 rounded-full font-black uppercase text-[11px] tracking-widest"
            >
              Send your brief <ArrowRight size={16} weight="bold" />
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

      {/* ---------------- 03 · THE PROCESS ---------------- */}
      <section className="max-w-6xl mx-auto px-5 md:px-6 pt-16 md:pt-20">
        <SectionRule n="03">How it runs</SectionRule>
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
        <p className="text-sm text-white/50 font-light leading-relaxed mt-6 max-w-2xl">
          No catalogue to work through, and nothing is held in stock — which is exactly why the price works at
          volume. If you can describe it, we can price it.
        </p>
      </section>

      {/* ---------------- QUOTE FORM ---------------- */}
      <section ref={formRef} className="max-w-2xl mx-auto px-5 md:px-6 pt-16 md:pt-20 pb-24 scroll-mt-16">
        <SectionRule n="04">Request your quote</SectionRule>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {done ? (
            <div className="p-8 md:p-14 text-center">
              <SealCheck size={52} weight="fill" className="text-[#FF9900] mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3">We have your brief.</h2>
              <p className="text-white/60 font-light leading-relaxed max-w-md mx-auto mb-8">
                {leadQuality === 'low'
                  ? 'We’ve sent our indicative pricing to your inbox. When you’re ready to move on volumes, reply to that email and we’ll prepare a formal landed-cost quotation.'
                  : 'We’ll confirm factory availability and lead times, then issue a formal landed-cost quotation within one business day. A confirmation is already in your inbox.'}
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
                      onClick={() => setStep(2)}
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
                    {/* Their own words. A list of lines to tick told them less
                        than a sentence from them tells us. */}
                    <div>
                      <label className={labelCls} htmlFor="c-needs">What are you sourcing? *</label>
                      <textarea
                        id="c-needs" rows={5} className={`${field} resize-none`}
                        value={needs} onChange={e => setNeeds(e.target.value)}
                        placeholder="e.g. 30 ergonomic office chairs, mesh back, black — and 12 monitors, 27 inch. Models, sizes, colours, branding, deadlines, or paste a schedule."
                      />
                      <p className="text-[11px] text-white/40 font-medium mt-2">
                        Anything we sell as a single we can quote in volume, and plenty we don’t list at all.
                        If you have a schedule, paste it here.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls} htmlFor="c-qty">Roughly how many *</label>
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

                    <p className="text-sm text-white/50 font-light leading-relaxed">
                      Buying one or two rather than a dozen? Our{' '}
                      <Link to="/shop" className="underline decoration-[#FF9900]/60 hover:text-[#FF9900] transition-colors">retail shop</Link>{' '}
                      is the quicker route — same goods, priced per unit.
                    </p>

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
