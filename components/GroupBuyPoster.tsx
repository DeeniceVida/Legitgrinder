import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersThree, ArrowRight, CaretLeft, CaretRight, Clock,
  AirplaneTilt, Boat, HandCoins, Package
} from '@phosphor-icons/react';
import { GroupCampaign } from '../services/groupBuys';
import SafeImage from './SafeImage';

interface GroupBuyPosterProps {
  campaigns: GroupCampaign[];
}

const ROTATE_MS = 7000;

/** Human countdown to the deadline — urgency without a ticking clock. */
const closesIn = (iso?: string): string | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'Closing within the hour';
  if (hours < 24) return `Closes in ${hours} hour${hours > 1 ? 's' : ''}`;
  const days = Math.round(hours / 24);
  return `Closes in ${days} day${days > 1 ? 's' : ''}`;
};

/**
 * The group-buy poster shown in the shop's sliding banner area. Image sits on
 * the left, the pitch on the right: what it is, the per-unit price, and the
 * three things that actually sell a group buy — reserve with a deposit, pay the
 * balance on arrival, and a clear shipping window.
 */
const GroupBuyPoster: React.FC<GroupBuyPosterProps> = ({ campaigns }) => {
  // Only campaigns that are genuinely open and not past their deadline.
  const live = campaigns.filter(c =>
    c.status === 'open' && (!c.closesAt || new Date(c.closesAt).getTime() > Date.now())
  );
  const count = live.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir: number) => {
    setIndex(i => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIndex(i => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  if (count === 0) return null;

  return (
    <section
      className="relative mb-10 rounded-[1.75rem] overflow-hidden bg-[#0f1a1c] text-white"
      aria-roledescription="carousel"
      aria-label="Group buys open now"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-16 w-72 h-72 bg-[#FF9900]/15 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-28 left-1/3 w-72 h-72 bg-[#3D8593]/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Slides are stacked in one grid cell so the poster grows to fit the
          tallest slide — no fixed heights that could clip the CTA on mobile. */}
      <div className="relative grid">
        {live.map((c, i) => {
          const deposit = c.minDepositKES > 0 ? c.minDepositKES : Math.round(c.unitPriceKES / 2);
          const countdown = closesIn(c.closesAt);
          const bySea = c.shippingMode === 'sea';
          const cover = (c.imageUrls && c.imageUrls[0]) || c.imageUrl;

          return (
            <div
              key={c.id}
              className={`col-start-1 row-start-1 transition-opacity duration-700 ${i === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              aria-hidden={i !== index}
            >
              <div className="max-w-6xl mx-auto px-5 md:px-10 pt-7 pb-16 md:py-8 grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] items-center gap-6 md:gap-10">

                {/* IMAGE — left on desktop, top on mobile */}
                <div className="relative w-full h-[170px] sm:h-[200px] md:h-[240px] rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 shrink-0">
                  {cover ? (
                    <SafeImage src={cover} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={44} weight="duotone" className="text-white/25" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF9900] text-[#0f1a1c] text-[9px] font-black uppercase tracking-widest shadow-lg">
                    <UsersThree size={12} weight="fill" /> Group Buy
                  </span>
                </div>

                {/* COPY — right */}
                <div className="min-w-0">
                  {countdown && (
                    <span className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-[#7fc2ce]">
                      <Clock size={12} weight="fill" /> {countdown}
                    </span>
                  )}

                  <h3 className="text-2xl md:text-4xl font-bold tracking-tight leading-[1.08] mb-2 heading-accent line-clamp-2">
                    {c.title}
                  </h3>

                  {c.description && (
                    <p className="text-sm text-white/60 font-light leading-relaxed mb-4 line-clamp-2 max-w-xl">
                      {c.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-2.5 mb-4">
                    <span className="text-2xl md:text-3xl font-black tracking-tight text-[#FF9900]">
                      KES {c.unitPriceKES.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      per unit · all-inclusive
                    </span>
                  </div>

                  {/* The three things that sell a group buy */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-[11px] font-bold text-white/85">
                      <HandCoins size={14} weight="duotone" className="text-[#7fc2ce]" />
                      Reserve from KES {deposit.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-[11px] font-bold text-white/85">
                      <Package size={14} weight="duotone" className="text-[#7fc2ce]" />
                      Balance on arrival
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-[11px] font-bold text-white/85">
                      {bySea
                        ? <><Boat size={14} weight="duotone" className="text-[#7fc2ce]" /> Sea · 30–45 days</>
                        : <><AirplaneTilt size={14} weight="duotone" className="text-[#7fc2ce]" /> Air · 2–3 weeks</>}
                    </span>
                  </div>

                  <Link
                    to={`/group/${c.slug}`}
                    className="inline-flex items-center gap-2.5 bg-[#FF9900] text-[#0f1a1c] px-8 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-white transition-colors active:scale-95"
                  >
                    Reserve yours <ArrowRight size={15} weight="bold" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {count > 1 && (
        <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-5 md:px-10 py-4 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {live.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to group buy ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-[#FF9900]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={() => go(-1)} aria-label="Previous" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button onClick={() => go(1)} aria-label="Next" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#FF9900] hover:bg-white text-[#0f1a1c] flex items-center justify-center transition-colors">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default GroupBuyPoster;
