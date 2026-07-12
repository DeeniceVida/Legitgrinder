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
      {/* Track */}
      <div className="relative h-[300px] md:h-[280px]">
        {products.map((p, i) => {
          const theme = THEMES[i % THEMES.length];
          const price = p.discountPriceKES || p.priceKES;
          const onSale = !!p.discountPriceKES;
          const inStock = p.availability === Availability.LOCAL && (p.stockCount || 0) > 0;
          return (
            <div
              key={p.id}
              className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              style={{ backgroundColor: theme.bg, color: theme.text }}
              aria-hidden={i !== index}
            >
              <div className="h-full max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                {/* Copy */}
                <div className="py-8 order-2 md:order-1">
                  <div className="flex items-center gap-2 mb-3">
                    {onSale && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: theme.accent, color: theme.bg }}>On Offer</span>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {inStock ? `In stock · ${p.stockCount} available` : p.availability === Availability.IMPORT ? 'Import on order' : 'Ready to ship'}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-bold tracking-tight leading-[1.05] mb-2 line-clamp-2 heading-accent">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="text-xl md:text-2xl font-black tracking-tight">KES {price.toLocaleString()}</span>
                    {onSale && <span className="text-sm line-through opacity-50">KES {p.priceKES.toLocaleString()}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => onOpen(p.id)}
                      className="px-7 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center gap-2 transition-transform hover:scale-105"
                      style={{ backgroundColor: theme.accent, color: theme.bg }}
                    >
                      Buy Now <ArrowRight size={15} weight="bold" />
                    </button>
                    <button
                      onClick={() => askOnWhatsApp(p)}
                      className="px-7 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center gap-2 border-2 transition-colors hover:bg-black/5"
                      style={{ borderColor: theme.accent, color: theme.accent }}
                    >
                      <WhatsappLogo size={15} weight="fill" /> Ask
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div className="order-1 md:order-2 h-full flex items-center justify-center md:justify-end py-6">
                  <button onClick={() => onOpen(p.id)} className="h-full max-h-[160px] md:max-h-[220px] aspect-square cursor-pointer">
                    <SafeImage src={p.imageUrls[0]} alt={p.name} className="h-full w-full object-contain drop-shadow-2xl" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {count > 1 && (
        <>
          {/* Dots (bottom-left) */}
          <div className="absolute bottom-5 left-6 md:left-12 z-20 flex items-center gap-2">
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
          {/* Arrows (bottom-right) */}
          <div className="absolute bottom-4 right-4 md:right-6 z-20 flex items-center gap-2">
            <button onClick={() => go(-1)} aria-label="Previous" className="w-10 h-10 rounded-full bg-white/70 backdrop-blur hover:bg-white text-gray-900 flex items-center justify-center transition-colors shadow">
              <CaretLeft size={18} weight="bold" />
            </button>
            <button onClick={() => go(1)} aria-label="Next" className="w-10 h-10 rounded-full bg-[#0f1a1c] hover:bg-[#3D8593] text-white flex items-center justify-center transition-colors shadow">
              <CaretRight size={18} weight="bold" />
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default FeaturedCarousel;
