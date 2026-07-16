import React from 'react';
import {
  InstagramLogo, TiktokLogo, EnvelopeSimple, ArrowUpRight,
  UsersThree, Briefcase, ArrowRight
} from '@phosphor-icons/react';
import { Reveal } from '../components/Motion';

const CONTACT_EMAIL = 'mungaimports@gmail.com';

const socialCards = [
  {
    href: 'https://instagram.com/legitgrinder.imports',
    Icon: InstagramLogo,
    name: 'Instagram',
    handle: '@legitgrinder.imports',
    desc: 'Daily drops, new arrivals and sourcing insights for our community.',
  },
  {
    href: 'https://tiktok.com/@legitgrinderimports',
    Icon: TiktokLogo,
    name: 'TikTok',
    handle: '@legitgrinderimports',
    desc: 'Watch our unboxing and sourcing process live, in action.',
  },
];

const partnerTypes = [
  {
    Icon: UsersThree,
    title: 'Influencers & Creators',
    desc: 'Showcase our premium imports to your audience. Competitive affiliate commissions plus exclusive products for content creation.',
  },
  {
    Icon: Briefcase,
    title: 'Business & Wholesale',
    desc: 'Scale your local business with direct global sourcing. We handle the heavy lifting — from supplier warehouse to your Nairobi collection point.',
  },
];

const Collaboration: React.FC = () => {
  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <Reveal>
          <div className="mb-14 max-w-3xl">
            <p className="eyebrow text-[#3D8593] mb-4">Partnerships</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 leading-[1.02]">
              Let's scale <span className="heading-accent italic font-light text-[#3D8593]">together.</span>
            </h1>
            <p className="text-gray-500 font-light text-lg leading-relaxed">
              Whether you're a content creator showcasing global tech or a business looking for a reliable
              sourcing partner — there's a way for us to grow together.
            </p>
          </div>
        </Reveal>

        {/* SOCIAL CARDS */}
        <div className="grid md:grid-cols-2 gap-5 mb-20">
          {socialCards.map(({ href, Icon, name, handle, desc }, i) => (
            <Reveal key={name} delay={i * 130}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block h-full overflow-hidden rounded-[2rem] bg-white border border-gray-100 p-9 md:p-10 hover:border-[#3D8593]/30 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-500"
              >
                <Icon size={180} weight="fill" className="absolute -top-6 -right-6 text-gray-50 group-hover:text-teal-50 transition-colors duration-500" aria-hidden="true" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center mb-7">
                    <Icon size={28} weight="duotone" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">{name}</h3>
                  <p className="text-gray-500 font-light leading-relaxed mb-7 max-w-xs">{desc}</p>
                  <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#3D8593] group-hover:gap-3 transition-all">
                    {handle} <ArrowUpRight size={14} weight="bold" />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>

        {/* HOW WE WORK + CONTACT */}
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1a1c] text-white p-8 md:p-14">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#3D8593]/10 rounded-full -mr-24 -mt-24 blur-3xl" aria-hidden="true"></div>
            <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-20">
              <div>
                <p className="eyebrow text-[#FF9900] mb-5">How we work</p>
                <div className="space-y-9">
                  {partnerTypes.map(({ Icon, title, desc }) => (
                    <div key={title} className="flex gap-5">
                      <div className="shrink-0 w-13 h-13 md:w-14 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center text-[#7fc2ce]">
                        <Icon size={26} weight="duotone" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-2">{title}</h4>
                        <p className="text-white/55 font-light leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-[1.5rem] bg-white/5 border border-white/10 p-8 md:p-10 backdrop-blur-sm">
                <EnvelopeSimple size={40} weight="duotone" className="text-[#7fc2ce] mb-6" />
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Direct inquiries</h3>
                <p className="text-white/55 font-light leading-relaxed mb-8">
                  Send your proposal or bulk request and I'll get back to you within 24 hours.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="btn-vibrant-orange shine inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-black uppercase text-[11px] tracking-widest w-fit"
                >
                  {CONTACT_EMAIL} <ArrowRight size={15} weight="bold" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default Collaboration;
