import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, TiktokLogo, InstagramLogo, GoogleLogo, Globe,
  Handshake, ShieldCheck, Package, Star, Quotes
} from '@phosphor-icons/react';
import { Reveal, CountUp } from '../components/Motion';

const stats = [
  { end: 30000, suffix: '+', decimals: 0, label: 'Community Followers' },
  { end: 100, suffix: '+', decimals: 0, label: 'Five-Star Reviews' },
  { end: 2021, decimals: 0, label: 'Sourcing Since', plain: true },
  { end: 3, decimals: 0, label: 'Global Sourcing Hubs' },
];

const values = [
  { Icon: Star, title: 'Proven Track Record', desc: 'Years of experience and hundreds of successful deliveries. Our reputation is built on the satisfaction of every client we serve.' },
  { Icon: Handshake, title: 'Honesty First', desc: 'Clear communication and transparent pricing — all-inclusive to Nairobi CBD. No hidden fees, no surprises at the finish line.' },
  { Icon: Globe, title: 'Global Reach', desc: 'Solid supplier networks across China, the USA and Dubai, so you get the best quality products at the best possible prices.' },
  { Icon: ShieldCheck, title: 'Dependability', desc: 'From the moment you order until it is in your hands, your package is treated with the utmost priority and care.' },
];

const socials = [
  { href: 'https://www.tiktok.com/@legitgrinderimports', label: 'TikTok', Icon: TiktokLogo },
  { href: 'https://www.instagram.com/legitgrinder.imports', label: 'Instagram', Icon: InstagramLogo },
  { href: 'https://share.google/DDnPWrlwWvOIsYdHZ', label: 'Google Reviews', Icon: GoogleLogo },
];

const AboutUs: React.FC = () => {
  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <Reveal>
          <div className="mb-14 max-w-3xl">
            <p className="eyebrow text-[#3D8593] mb-4">Since 2021 · Nairobi, Kenya</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 leading-[1.02]">
              International shopping, made <span className="heading-accent italic font-light text-[#3D8593]">honest &amp; effortless.</span>
            </h1>
            <p className="text-gray-500 font-light text-lg leading-relaxed">
              Legit Grinder Imports was born from a simple necessity: making global sourcing accessible and
              stress-free for Kenyans. We started as a small agency with a big vision — today we're a community
              of <strong className="text-gray-900 font-semibold">30,000+</strong> backed by <strong className="text-gray-900 font-semibold">100+</strong> five-star reviews.
            </p>
          </div>
        </Reveal>

        {/* STAT BAR */}
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6 py-9 px-8 mb-16 rounded-[1.75rem] bg-[#0f1a1c] text-white">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center lg:items-start text-center lg:text-left">
                {s.plain ? (
                  <span className="text-3xl md:text-4xl font-black tracking-tighter text-white">{s.end}</span>
                ) : (
                  <CountUp end={s.end} suffix={s.suffix} decimals={s.decimals} className="text-3xl md:text-4xl font-black tracking-tighter text-white" />
                )}
                <span className="eyebrow text-[#FF9900] mt-2">{s.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* MISSION + GOAL */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Reveal>
            <div className="h-full p-8 md:p-10 rounded-[1.75rem] bg-white border border-gray-100">
              <p className="eyebrow text-[#3D8593] mb-4">Our Goal</p>
              <p className="text-gray-600 font-light leading-relaxed">
                A smooth, hands-off experience. Ordering from abroad should feel as easy as buying from a local shop.
                We manage the sourcing, shipping and clearing, so your items arrive safely while you focus on what matters most.
              </p>
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="h-full p-8 md:p-10 rounded-[1.75rem] bg-white border border-gray-100">
              <p className="eyebrow text-[#3D8593] mb-4">Our Mission</p>
              <p className="text-gray-600 font-light leading-relaxed">
                To empower Kenyan consumers and businesses with transparent, honest and dependable importing solutions
                that eliminate the risks of international trade — bridging global markets and your doorstep.
              </p>
            </div>
          </Reveal>
        </div>

        {/* VALUES */}
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Why importers <span className="text-[#3D8593] italic heading-accent font-light">stay with us.</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-5 mb-20">
          {values.map(({ Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 2) * 130}>
              <div className="h-full p-8 rounded-[1.75rem] bg-white border border-gray-100 hover:border-[#3D8593]/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500">
                <div className="w-13 h-13 md:w-14 md:h-14 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center mb-6">
                  <Icon size={26} weight="duotone" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm font-light leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CONNECT / CTA */}
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1a1c] text-white px-8 py-14 md:p-16">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#3D8593]/10 rounded-full -mr-28 -mt-28 blur-3xl" aria-hidden="true"></div>
            <div className="relative max-w-2xl">
              <Quotes size={40} weight="fill" className="text-[#3D8593]/30 mb-5" aria-hidden="true" />
              <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                Ready to start your <span className="heading-accent italic font-light text-[#3D8593]">importing journey?</span>
              </h3>
              <p className="text-white/60 font-light leading-relaxed mb-9">
                Follow along for the latest arrivals, client stories and sourcing tips — or reach out and let's get your next order moving.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                {socials.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-[#3D8593] transition-colors px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-widest"
                  >
                    <Icon size={16} weight="fill" /> {label}
                  </a>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-9 border-t border-white/15">
                <a
                  href="https://wa.me/254791873538"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-vibrant-orange shine px-9 py-4 rounded-full font-black uppercase text-[11px] tracking-widest inline-flex items-center justify-center gap-3 w-fit"
                >
                  Chat on WhatsApp <ArrowRight size={15} weight="bold" />
                </a>
                <Link to="/shop" className="inline-flex items-center gap-2.5 text-white/70 hover:text-white transition-colors font-bold text-sm">
                  <Package size={18} weight="duotone" /> Browse the inventory
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default AboutUs;
