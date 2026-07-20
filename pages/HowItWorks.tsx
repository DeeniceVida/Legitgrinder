import React from 'react';
import { Link } from 'react-router-dom';
import {
  WhatsappLogo, ArrowRight, LinkSimple, Receipt, AirplaneTilt, Boat, Package,
  MapPin, SealCheck, ShoppingCartSimple, HandCoins, Coins, CheckCircle,
  Storefront, UsersThree, Calculator, ChatCircleText, Timer
} from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';
import { Reveal } from '../components/Motion';

/**
 * The one link Dennis sends when a client asks "how does this work?"
 * Everything a first-time importer needs: the steps, the 3-part quote,
 * when you pay (China vs US/UK), timelines, and the promises.
 */

const startOrderMsg = encodeURIComponent(
  `Hi LegitGrinder! I'd like to place an order.\n\nProduct link(s): \nQuantity: `
);
const WA_START = `https://wa.me/${WHATSAPP_NUMBER}?text=${startOrderMsg}`;

const steps = [
  { n: '01', Icon: LinkSimple, title: 'Send your link', desc: 'WhatsApp us the product link (or a photo) and how many pieces you want.' },
  { n: '02', Icon: Receipt, title: 'Get your quote', desc: 'We reply with a clear 3-part breakdown — buying price, shipping fee, service fee. No hidden costs.' },
  { n: '03', Icon: AirplaneTilt, title: 'We buy & ship', desc: 'Once you pay, we purchase from the store, consolidate, ship and clear customs. Track it live anytime.' },
  { n: '04', Icon: Package, title: 'Collect in Nairobi', desc: 'Pick up in Nairobi CBD — or we hand it to a rider to bring it to you (rider fee applies).' },
];

const feeParts = [
  {
    Icon: ShoppingCartSimple,
    title: 'Buying Price',
    lead: 'What the store charges',
    desc: 'The actual price of your item at the source store, converted to Kenyan shillings at the day\'s rate.'
  },
  {
    Icon: AirplaneTilt,
    title: 'Shipping Fee',
    lead: 'Getting it to Kenya',
    desc: 'Billed by your item\'s exact weight (air) or volume (sea) — you only pay for the space your item actually takes.'
  },
  {
    Icon: HandCoins,
    title: 'Service Fee',
    lead: 'Our sourcing fee',
    desc: 'From KES 3,000. For items above KES 100,000 it becomes 4% of the buying price — or 5% for business goods and work machines.'
  },
];

const timelines = [
  { Icon: AirplaneTilt, route: 'China · Air', time: '2–3 weeks' },
  { Icon: Boat, route: 'China · Sea', time: '30–45 days' },
  { Icon: AirplaneTilt, route: 'US / UK · Air', time: '2–3 weeks' },
  { Icon: Boat, route: 'US · Sea', time: '60–90 days' },
];

const promises = [
  { title: 'All-inclusive to Nairobi', desc: 'The total we quote is the total you pay — shipping, customs and clearance are all in it. No surprise charges when it lands.' },
  { title: 'Doorstep delivery, your way', desc: 'Collection in Nairobi CBD is free. Prefer delivery? We hand your package to a trusted rider — the rider\'s fee is agreed between you and them.' },
  { title: 'Orders placed within 1 business day', desc: 'Your order is placed with the store within one business day of your payment confirming — the time it takes funds to settle.' },
  { title: 'Track it the whole way', desc: 'Every order gets a tracking number. Watch it move from the store to Nairobi on our live tracker.' },
];

const moreWays = [
  { to: '/shop', Icon: Storefront, title: 'In-Stock Shop', desc: 'Already in Nairobi — pay via M-Pesa Till and pick up the same day.' },
  { href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi LegitGrinder! What group buys are running right now?')}`, Icon: UsersThree, title: 'Group Buys', desc: 'Join a bulk order with a small deposit and pay the balance when it lands. Ask what\'s running.' },
  { to: '/calculators', Icon: Calculator, title: 'Cost Calculators', desc: 'Paste a US listing and see your full landed cost yourself — free, instant.' },
  { to: '/consultation', Icon: ChatCircleText, title: 'Strategy Session', desc: 'A $15 one-on-one for bigger plans — credited back when you order.' },
];

const HowItWorks: React.FC = () => {
  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">

        {/* HERO */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="eyebrow text-[#3D8593] mb-4">New here? Start with this</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-5 leading-[1.02]">
              How ordering <span className="heading-accent italic font-light text-[#3D8593]">works.</span>
            </h1>
            <p className="text-gray-500 font-light text-lg leading-relaxed mb-8">
              We buy from stores in China, the USA and the UK, ship to Kenya, clear customs,
              and hand you your item in Nairobi. Here's the whole process — prices, payments and timelines included.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={WA_START} target="_blank" rel="noopener noreferrer"
                className="btn-vibrant-orange shine inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full font-black uppercase text-[11px] tracking-widest">
                <WhatsappLogo size={17} weight="fill" /> Start an Order
              </a>
              <Link to="/calculators"
                className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full font-black uppercase text-[11px] tracking-widest border border-gray-200 text-gray-600 hover:border-[#3D8593] hover:text-[#3D8593] transition-colors bg-white">
                Estimate a Cost First
              </Link>
            </div>
          </div>
        </Reveal>

        {/* THE 4 STEPS */}
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {steps.map(({ n, Icon, title, desc }, i) => (
            <Reveal key={n} delay={i * 110}>
              <li className="h-full bg-white rounded-[1.75rem] border border-gray-100 p-7 hover:border-[#3D8593]/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500">
                <div className="flex items-center justify-between mb-5">
                  <span className="w-12 h-12 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center">
                    <Icon size={24} weight="duotone" />
                  </span>
                  <span className="eyebrow text-gray-300">Step {n}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm font-light leading-relaxed">{desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        {/* THE QUOTE — 3 PARTS */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="eyebrow text-[#3D8593] mb-4">The Quote</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.05]">
              Every quote has <span className="heading-accent italic font-light text-[#3D8593]">three parts.</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {feeParts.map(({ Icon, title, lead, desc }, i) => (
            <Reveal key={title} delay={i * 110}>
              <div className="h-full bg-white rounded-[1.75rem] border border-gray-100 p-8">
                <span className="w-13 h-13 md:w-14 md:h-14 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center mb-6">
                  <Icon size={26} weight="duotone" />
                </span>
                <p className="eyebrow text-gray-300 mb-1.5">{lead}</p>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm font-light leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="text-center text-sm text-gray-500 font-light mb-20">
            Add the three together and that's your <strong className="text-gray-900 font-semibold">total landed cost</strong> — what you pay, nothing more.
          </p>
        </Reveal>

        {/* WHEN YOU PAY */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="eyebrow text-[#3D8593] mb-4">Payments</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.05]">
              When do you <span className="heading-accent italic font-light text-[#3D8593]">pay?</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <Reveal>
            <div className="h-full bg-white rounded-[1.75rem] border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-12 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center"><Boat size={24} weight="duotone" /></span>
                <h3 className="text-xl font-bold text-gray-900">Orders from China</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <CheckCircle size={20} weight="fill" className="text-[#3D8593] shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 font-light leading-relaxed">
                    <strong className="font-bold text-gray-900">Upfront:</strong> buying price + service fee — this is what gets your order purchased.
                  </p>
                </li>
                <li className="flex gap-3">
                  <CheckCircle size={20} weight="fill" className="text-[#FF9900] shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 font-light leading-relaxed">
                    <strong className="font-bold text-gray-900">On arrival:</strong> the shipping fee — calculated from your item's exact weight once it's shipped, and paid before collection.
                  </p>
                </li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={110}>
            <div className="h-full bg-white rounded-[1.75rem] border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF9900] flex items-center justify-center"><AirplaneTilt size={24} weight="duotone" /></span>
                <h3 className="text-xl font-bold text-gray-900">Orders from US / UK</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <CheckCircle size={20} weight="fill" className="text-[#3D8593] shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 font-light leading-relaxed">
                    <strong className="font-bold text-gray-900">Everything upfront:</strong> buying price + shipping + service fee in one total — then you simply wait for your item.
                  </p>
                </li>
                <li className="flex gap-3">
                  <Coins size={20} weight="duotone" className="text-gray-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 font-light leading-relaxed">
                    Payment is by card or M-Pesa through a secure Paystack link we send you.
                  </p>
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <p className="text-center text-sm text-gray-500 font-light mb-20">
            Working with a budget? <strong className="text-gray-900 font-semibold">Deposits can be arranged</strong> — talk to us and we'll structure it.
          </p>
        </Reveal>

        {/* TIMELINES */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="eyebrow text-[#3D8593] mb-4">Timelines</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.05]">
              How long does it <span className="heading-accent italic font-light text-[#3D8593]">take?</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {timelines.map(({ Icon, route, time }, i) => (
            <Reveal key={route} delay={i * 110}>
              <div className="bg-[#0f1a1c] text-white rounded-[1.75rem] p-7 text-center">
                <Icon size={26} weight="duotone" className="text-[#7fc2ce] mx-auto mb-4" />
                <p className="text-2xl md:text-3xl font-black tracking-tighter mb-1.5">{time}</p>
                <p className="eyebrow text-[#FF9900]">{route}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="flex items-center justify-center gap-2 text-sm text-gray-500 font-light mb-20">
            <Timer size={16} weight="duotone" className="text-[#3D8593]" />
            The clock starts when your order is placed — within 1 business day of your payment confirming.
          </p>
        </Reveal>

        {/* PROMISES */}
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1a1c] text-white p-8 md:p-14 mb-20">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#3D8593]/10 rounded-full -mr-24 -mt-24 blur-3xl" aria-hidden="true"></div>
            <div className="relative">
              <p className="eyebrow text-[#FF9900] mb-3">Our Promises</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-10">
                What you can <span className="heading-accent italic font-light text-[#7fc2ce]">hold us to.</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
                {promises.map(({ title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <SealCheck size={22} weight="fill" className="text-[#3D8593] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold mb-1.5">{title}</h4>
                      <p className="text-white/55 text-sm font-light leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center gap-x-8 gap-y-3">
                <Link to="/tracking" className="inline-flex items-center gap-2 text-[#7fc2ce] hover:text-white transition-colors font-bold text-sm">
                  <MapPin size={17} weight="duotone" /> Track an order
                </Link>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#7fc2ce] hover:text-white transition-colors font-bold text-sm">
                  <WhatsappLogo size={17} weight="fill" /> Ask us anything
                </a>
              </div>
            </div>
          </div>
        </Reveal>

        {/* MORE WAYS */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="eyebrow text-[#3D8593] mb-4">Beyond sourcing</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.05]">
              More ways to <span className="heading-accent italic font-light text-[#3D8593]">buy.</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {moreWays.map(({ to, href, Icon, title, desc }, i) => {
            const inner = (
              <>
                <span className="w-12 h-12 rounded-2xl bg-teal-50 text-[#3D8593] flex items-center justify-center mb-5">
                  <Icon size={24} weight="duotone" />
                </span>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm font-light leading-relaxed mb-4">{desc}</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#3D8593]">
                  {href ? 'Ask on WhatsApp' : 'Open'} <ArrowRight size={12} weight="bold" />
                </span>
              </>
            );
            const cls = 'group h-full block bg-white rounded-[1.75rem] border border-gray-100 p-7 hover:border-[#3D8593]/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500';
            return (
              <Reveal key={title} delay={i * 110}>
                {to
                  ? <Link to={to} className={cls}>{inner}</Link>
                  : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>}
              </Reveal>
            );
          })}
        </div>

        {/* FINAL CTA */}
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter leading-[1.05] mb-4">
              Ready? <span className="heading-accent italic font-light text-[#3D8593]">Send your link.</span>
            </h2>
            <p className="text-gray-500 font-light mb-8">
              Product link + quantity on WhatsApp — you'll have your full quote shortly.
            </p>
            <a href={WA_START} target="_blank" rel="noopener noreferrer"
              className="btn-vibrant-orange shine inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-widest">
              <WhatsappLogo size={18} weight="fill" /> Start My Order <ArrowRight size={15} weight="bold" />
            </a>
            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-gray-400">
              WhatsApp · 0791 873 538
            </p>
          </div>
        </Reveal>

      </div>
    </div>
  );
};

export default HowItWorks;
