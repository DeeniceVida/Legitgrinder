import React, { useState, useEffect, useCallback } from 'react';
import { CaretLeft, CaretRight, ArrowRight, WhatsappLogo } from '@phosphor-icons/react';
import { Product, Availability } from '../types';
import { WHATSAPP_NUMBER } from '../constants';
import SafeImage from './SafeImage';

interface FeaturedCarouselProps {
  products: Product[];
  onOpen: (id: string) => void;
}

// Rotating pastel backdrops (Back Market style)
const THEMES = [
  { bg: '#E8F59E', text: '#0f1a1c', accent: '#0f1a1c' }, // lime
  { bg: '#D6ECEF', text: '#0f1a1c', accent: '#3D8593' }, // teal mist
  { bg: '#FFE4C2', text: '#0f1a1c', accent: '#c96a00' }, // peach
  { bg: '#E7E0F7', text: '#0f1a1c', accent: '#6b4fbb' }, // lilac
  { bg: '#0f1a1c', text: '#ffffff', accent: '#FF9900' }, // ink
];

const ROTATE_MS = 6000;

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ products, onOpen }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = products.length;

  const go = useCallback((dir: number) => {
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;

  const askOnWhatsApp = (p: Product) => {
    const msg = encodeURIComponent(`Hi LegitGrinder! I'm interested in the ${p.name} (KES ${(p.discountPriceKES || p.priceKES).toLocaleString()}). Is it available?`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener');
  };

  return (
    <section
      className="relative mb-10 rounded-[1.75rem] overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Track — taller on mobile so the stacked layout fits fully */}
      <div className="relative h-[440px] sm:h-[360px] md:h-[300px]">
        {products.map((p, i) => {
          const theme = THEMES[i % THEMES.length];
          const pv = (p.variations || []).filter(v => (v.priceKES || 0) > 0);
          const base = p.discountPriceKES || p.priceKES;
          const displayPrice = pv.length ? base + Math.min(...pv.map(v => v.priceKES)) : base;
          const isFrom = pv.length > 0;
          const onSale = !!p.discountPriceKES && !isFrom;
          const inStock = p.availability === Availability.LOCAL && (p.stockCount || 0) > 0;
          return (
            <div
              key={p.id}
              className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              style={{ backgroundColor: theme.bg, color: theme.text }}
              aria-hidden={i !== index}
            >
              <div className="h-full max-w-6xl mx-auto px-5 md:px-12 grid grid-cols-1 md:grid-cols-2 items-center gap-1 md:gap-4">
                {/* Image — top on mobile, right on desktop */}
                <div className="order-1 md:order-2 flex items-center justify-center md:justify-end pt-6 md:py-6 h-[130px] sm:h-[150px] md:h-full shrink-0">
                  <button onClick={() => onOpen(p.id)} className="h-full max-h-[120px] sm:max-h-[150px] md:max-h-[220px] aspect-square cursor-pointer">
                    <SafeImage src={p.imageUrls[0]} alt={p.name} className="h-full w-full object-contain drop-shadow-2xl" />
                  </button>
                </div>

                {/* Copy — centered on mobile, left on desktop */}
                <div className="order-2 md:order-1 pb-16 md:py-8 text-center md:text-left flex flex-col items-center md:items-start">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2 md:mb-3">
                    {onSale && (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: theme.accent, color: theme.bg }}>On Offer</span>
                    )}
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60">
                      {inStock ? `In stock · ${p.stockCount} left` : p.availability === Availability.IMPORT ? 'Import on order' : 'Ready to ship'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight leading-[1.1] mb-2 line-clamp-2 heading-accent px-2 md:px-0">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-4 md:mb-6">
                    {isFrom && <span className="text-[10px] font-black uppercase tracking-widest opacity-50">From</span>}
                    <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight">KES {displayPrice.toLocaleString()}</span>
                    {onSale && <span className="text-sm line-through opacity-50">KES {p.priceKES.toLocaleString()}</span>}
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => onOpen(p.id)}
                      className="px-6 md:px-7 py-3 md:py-3.5 rounded-full font-black uppercase text-[10px] md:text-[11px] tracking-widest flex items-center gap-2 transition-transform active:scale-95 hover:scale-105"
                      style={{ backgroundColor: theme.accent, color: theme.bg }}
                    >
                      Buy Now <ArrowRight size={14} weight="bold" />
                    </button>
                    <button
                      onClick={() => askOnWhatsApp(p)}
                      className="px-6 md:px-7 py-3 md:py-3.5 rounded-full font-black uppercase text-[10px] md:text-[11px] tracking-widest flex items-center gap-2 border-2 transition-colors active:scale-95 hover:bg-black/5"
                      style={{ borderColor: theme.accent, color: theme.accent }}
                    >
                      <WhatsappLogo size={14} weight="fill" /> Ask
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls — pinned bottom bar so they never overlap content */}
      {count > 1 && (
        <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between px-5 md:px-12 py-4 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {products.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-black/70' : 'w-2 bg-black/25 hover:bg-black/40'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={() => go(-1)} aria-label="Previous" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/80 backdrop-blur hover:bg-white text-gray-900 flex items-center justify-center transition-colors shadow">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button onClick={() => go(1)} aria-label="Next" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#0f1a1c] hover:bg-[#3D8593] text-white flex items-center justify-center transition-colors shadow">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeaturedCarousel;
