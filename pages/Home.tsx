import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, MagnifyingGlass, Handshake, AirplaneTilt,
  Package, SealCheck, Star, Quotes, Storefront, Calculator, Phone
} from '@phosphor-icons/react';
import SafeImage from '../components/SafeImage';
import { Reveal, CountUp } from '../components/Motion';

const HERO_IMG = 'https://res.cloudinary.com/dsthpp4oj/image/upload/w_1920,q_auto,f_auto/v1766833528/pexels-hormel-media-1095814_jxyrhh.jpg';

const trustWords = [
  'Verified Suppliers', 'USA → Kenya', 'China → Kenya', 'Customs Cleared',
  'Doorstep Delivery', 'Authenticity Guaranteed', 'Live Order Tracking', 'CBD Pickup'
];

const processSteps = [
  { n: '01', title: 'Consult', desc: 'Tell me what you need — elite tech, tools, or bulk supplies.', Icon: MagnifyingGlass },
  { n: '02', title: 'Liaise', desc: 'I negotiate directly with verified suppliers in the USA & China.', Icon: Handshake },
  { n: '03', title: 'Ship', desc: 'Freight, customs and consolidation — fully handled.', Icon: AirplaneTilt },
  { n: '04', title: 'Deliver', desc: 'CBD pickup or courier to your doorstep in Kenya.', Icon: Package },
];

const testimonials = [
  { name: 'Uniquebysherah Operations', initials: 'US', tag: 'Business Importer', text: 'From China to Kenya, everything was handled professionally and arrived right at my doorstep. Communication was fast, updates were clear, and delivery was swift.' },
  { name: 'MD', initials: 'MD', tag: 'Tech Enthusiast', text: 'Imported my monitor, chair and lights from Dennis and the process was smooth — plus the quality was way better than what is found locally in Nairobi.' },
  { name: 'Abbywanjohi', initials: 'AW', tag: 'Phone Buyer', text: 'Unbelievable how my expectations were surpassed. The phone is clean, practically new. Lovely customer care. Literally Legit.' },
];

const Home: React.FC = () => {
  return (
    <div className="bg-brand-bg min-h-screen">
      {/* ============================================================
          HERO — full-bleed photo, outline + serif display type
         ============================================================ */}
      <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
        {/* Photo backdrop */}
        <div className="absolute inset-0" aria-hidden="true">
          <SafeImage src={HERO_IMG} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1a1c]/75 via-[#0f1a1c]/35 to-[#0f1a1c]/90"></div>
        </div>

        {/* Copy */}
        <div className="relative w-full max-w-7xl mx-auto px-6 pt-44 pb-16">
          <p className="eyebrow text-white/80 mb-8 flex items-center gap-4">
            <span className="h-px w-12 bg-[#FF9900]" aria-hidden="true"></span>
            USA &amp; China → Kenya &nbsp;·&nbsp; Door to Door
          </p>

          <h1 className="font-bold tracking-tighter leading-[0.9] mb-8">
            <span className="block text-outline text-6xl sm:text-7xl md:text-8xl xl:text-9xl uppercase">Your Private</span>
            <span className="block heading-accent italic font-light text-white text-5xl sm:text-6xl md:text-7xl xl:text-8xl mt-2">Sourcing Agent.</span>
          </h1>

          <p className="text-lg md:text-xl max-w-xl mb-10 text-white/75 font-light leading-relaxed">
            I source, negotiate, ship and deliver — from global suppliers straight
            to your hands in Kenya. No middlemen. No guesswork.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/shop"
              className="btn-vibrant-orange shine px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3"
            >
              View Inventory <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              to="/consultation"
              className="border border-white/40 text-white px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-[#0f1a1c] transition-all flex items-center justify-center backdrop-blur-sm"
            >
              Book Strategy Session
            </Link>
          </div>
        </div>

        {/* Stat bar — Vertex style, counts up on view */}
        <div className="relative border-t border-white/15 bg-[#0f1a1c]/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-7 grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
            {[
              { end: 2000, suffix: '+', decimals: 0, label: 'Importers Served' },
              { end: 98.4, suffix: '%', decimals: 1, label: 'Fulfillment Rate' },
              { end: 40, prefix: 'KES ', suffix: 'M+', decimals: 0, label: 'Value Handled in 2025' },
              { end: 14, suffix: ' Days', decimals: 0, label: 'Avg Delivery Window' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <CountUp
                  end={s.end}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                  className="text-3xl md:text-4xl font-black tracking-tighter text-white"
                />
                <span className="eyebrow text-[#FF9900] mt-2">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST MARQUEE
         ============================================================ */}
      <section className="py-9 border-b border-gray-100" aria-label="Service guarantees">
        <div className="marquee-mask overflow-hidden">
          <div className="flex w-max animate-marquee" aria-hidden="true">
            {[...trustWords, ...trustWords].map((word, i) => (
              <div key={i} className="flex items-center gap-3 px-8 shrink-0">
                <SealCheck size={18} weight="fill" className="text-[#3D8593]" />
                <span className="text-sm font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{word}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          THE PROCESS — compact single-viewport timeline
         ============================================================ */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
              <div>
                <p className="eyebrow text-[#3D8593] mb-4">The Process</p>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Brief to doorstep, <span className="text-[#3D8593] italic heading-accent font-light">in four moves.</span>
                </h2>
              </div>
              <p className="text-gray-500 font-light max-w-sm md:text-right">
                A high-touch sourcing model built on transparency and reliability.
              </p>
            </div>
          </Reveal>

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-7 left-7 right-7 h-px bg-gradient-to-r from-[#3D8593] via-[#3D8593]/40 to-[#FF9900]" aria-hidden="true"></div>

            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {processSteps.map(({ n, title, desc, Icon }, i) => (
                <Reveal key={n} delay={i * 130}>
                  <li className="relative">
                    <div className="relative z-10 w-14 h-14 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-[#3D8593] mb-6">
                      <Icon size={24} weight="duotone" />
                    </div>
                    <p className="eyebrow text-gray-300 mb-2">Step {n}</p>
                    <h3 className="text-xl font-bold mb-2">{title}</h3>
                    <p className="text-gray-500 text-sm font-light leading-relaxed max-w-[16rem]">{desc}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS — inline-avatar heading
         ============================================================ */}
      <section className="py-20 md:py-28 px-6 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.08] max-w-4xl mb-16">
              Trusted by{' '}
              <span className="inline-flex align-middle -space-x-3 mx-1" aria-hidden="true">
                {[11, 12, 13].map((i) => (
                  <span key={i} className="w-10 h-10 md:w-14 md:h-14 rounded-full border-[3px] border-white bg-neutral-100 overflow-hidden shadow-md inline-block">
                    <SafeImage src={`https://i.pravatar.cc/100?u=${i}`} alt="" />
                  </span>
                ))}
              </span>{' '}
              <span className="text-[#3D8593] italic heading-accent font-light">2,000+ importers</span> across East Africa.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((r, i) => (
              <Reveal key={r.name} delay={i * 130}>
                <figure className="h-full p-8 md:p-10 rounded-[2rem] bg-brand-bg border border-gray-100 hover:border-[#3D8593]/30 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-500 flex flex-col">
                  <Quotes size={36} weight="fill" className="text-[#3D8593]/20 mb-4" aria-hidden="true" />
                  <div className="flex gap-1 mb-5" aria-label="5 out of 5 stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={15} weight="fill" className="text-[#FF9900]" />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 leading-relaxed mb-8 font-light flex-1">"{r.text}"</blockquote>
                  <figcaption className="flex items-center gap-4">
                    <span className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center font-bold text-[#3D8593] uppercase">{r.initials}</span>
                    <span>
                      <span className="block font-bold text-gray-900">{r.name}</span>
                      <span className="block text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{r.tag}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA — heading + functional link cards
         ============================================================ */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05] mb-6">
                Ready to source your <span className="text-[#3D8593] italic heading-accent font-light">next order?</span>
              </h2>
              <p className="text-gray-500 text-lg font-light mb-10 max-w-md">
                Skip the middleman and the guesswork. Let's get your products from
                the global warehouse to your hands.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <Link
                  to="/consultation"
                  className="shine bg-[#0f1a1c] text-white px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors flex items-center justify-center gap-3 w-fit"
                >
                  Book a Strategy Call <ArrowRight size={16} weight="bold" />
                </Link>
                <a href="tel:+254791873538" className="flex items-center gap-3 text-gray-500 hover:text-[#3D8593] transition-colors font-bold text-sm">
                  <Phone size={18} weight="duotone" /> +254 791 873 538
                </a>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5">
            {[
              { to: '/shop', Icon: Storefront, title: 'Shop the Inventory', desc: 'iPhones, laptops and elite tech in stock — priced in KES.' },
              { to: '/calculators', Icon: Calculator, title: 'Estimate Your Costs', desc: 'Import duty, shipping and landed-cost calculators. Free.' },
            ].map(({ to, Icon, title, desc }, i) => (
              <Reveal key={to} delay={i * 130}>
                <Link
                  to={to}
                  className="group flex items-center justify-between gap-6 p-7 md:p-8 rounded-[1.8rem] bg-white border border-gray-100 hover:border-[#3D8593]/40 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-400"
                >
                  <span className="flex items-center gap-5">
                    <span className="w-13 h-13 md:w-14 md:h-14 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center shrink-0">
                      <Icon size={26} weight="duotone" />
                    </span>
                    <span>
                      <span className="block font-bold text-lg text-gray-900">{title}</span>
                      <span className="block text-sm text-gray-500 font-light mt-1">{desc}</span>
                    </span>
                  </span>
                  <span className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#FF9900] group-hover:border-[#FF9900] group-hover:text-white transition-all shrink-0">
                    <ArrowUpRight size={18} weight="bold" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
