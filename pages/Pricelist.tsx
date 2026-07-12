
import React, { useState, useMemo } from 'react';
import { MagnifyingGlass, ArrowDown, ArrowUp, WhatsappLogo, ArrowsClockwise, SealCheck } from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';
import { PricelistItem } from '../types';
import { Reveal } from '../components/Motion';

interface PricelistProps {
  pricelist: PricelistItem[];
  loading?: boolean;
}

const BRANDS = [
  { id: 'iphone', label: 'iPhone' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'pixel', label: 'Pixel' },
] as const;

const Pricelist: React.FC<PricelistProps> = ({ pricelist, loading = false }) => {
  const [activeBrand, setActiveBrand] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Title: Change to current month only 1 day into the new month (e.g., changes on the 2nd)
  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < 2 ? 1 : 0), 1);
  const displayMonth = displayDate.toLocaleString('default', { month: 'long' });
  const listTitle = `${displayMonth} ${displayDate.getFullYear()}`;

  const filteredModels = useMemo(() => {
    return pricelist.filter(item =>
      item.brand === activeBrand &&
      (item.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.series.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeBrand, searchTerm, pricelist]);

  const handleBuy = (model: string, capacity: string, price: number) => {
    const text = encodeURIComponent(`Hi LegitGrinder, I want to order the ${model} (${capacity}) - Refurbished (Good Condition). Listed Price: KES ${price.toLocaleString()}. I understand this is an all-inclusive price to Nairobi CBD.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <Reveal>
          <div className="mb-10 max-w-3xl">
            <p className="eyebrow text-[#3D8593] mb-4">Live Market Intelligence</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-5 leading-[1.02]">
              {listTitle} <span className="heading-accent italic font-light text-[#3D8593]">Price List.</span>
            </h1>
            <p className="text-gray-500 font-light mb-6">
              Refurbished · Good condition · All-inclusive to Nairobi CBD — no hidden fees.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                <ArrowsClockwise size={14} weight="bold" className="text-[#3D8593]" /> Auto-synced from US market monthly
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                <ArrowDown size={14} weight="bold" className="text-emerald-500" /> Dropped
                <span className="text-gray-300">/</span>
                <ArrowUp size={14} weight="bold" className="text-rose-500" /> Rose since last month
              </span>
            </div>
          </div>
        </Reveal>

        {/* CONTROLS */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-10">
          <div className="relative w-full lg:max-w-sm">
            <MagnifyingGlass size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search model (e.g. 15 Pro Max)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search phone models"
              className="w-full h-14 bg-white border border-gray-200 rounded-full pl-12 pr-6 text-sm font-medium focus:border-[#3D8593] transition-colors shadow-sm"
            />
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Phone brands">
            {BRANDS.map((brand) => (
              <button
                key={brand.id}
                role="tab"
                aria-selected={activeBrand === brand.id}
                onClick={() => setActiveBrand(brand.id)}
                className={`px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeBrand === brand.id
                  ? 'bg-[#0f1a1c] text-white shadow-lg'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#3D8593] hover:text-[#3D8593]'
                  }`}
              >
                {brand.label}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING SKELETON — prevents the "devices vanish" flash while data loads */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-[1.75rem] border border-gray-100 p-7 animate-pulse">
                <div className="h-3 w-16 bg-gray-100 rounded-full mb-3"></div>
                <div className="h-6 w-40 bg-gray-100 rounded-full mb-8"></div>
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between py-4 border-t border-gray-50">
                    <div className="h-4 w-14 bg-gray-100 rounded-full"></div>
                    <div className="h-4 w-24 bg-gray-100 rounded-full"></div>
                    <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : filteredModels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredModels.map((item, idx) => (
              <Reveal key={item.id} delay={(idx % 3) * 100}>
                <article className="h-full bg-white rounded-[1.75rem] border border-gray-100 p-7 hover:border-[#3D8593]/30 hover:shadow-xl hover:shadow-teal-900/5 transition-all duration-500">
                  <header className="mb-5">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1.5">{item.series}</p>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{item.modelName}</h3>
                  </header>

                  <div className="divide-y divide-gray-50">
                    {item.capacities.map((cap, cIdx) => {
                      const isPriceDrop = cap.previousPriceKES > 0 && cap.currentPriceKES < cap.previousPriceKES;
                      const isPriceIncrease = cap.previousPriceKES > 0 && cap.currentPriceKES > cap.previousPriceKES;

                      return (
                        <div key={cIdx} className="flex items-center justify-between gap-3 py-3.5 group">
                          <span className="shrink-0 w-16 text-[11px] font-black text-gray-400 uppercase tracking-wider">{cap.capacity}</span>
                          <span className="flex items-center gap-1.5 flex-1 justify-end">
                            {isPriceDrop && <ArrowDown size={14} weight="bold" className="text-emerald-500" aria-label="Price dropped" />}
                            {isPriceIncrease && <ArrowUp size={14} weight="bold" className="text-rose-500" aria-label="Price rose" />}
                            <span className={`text-base md:text-lg font-black tracking-tight ${isPriceDrop ? 'text-emerald-600' : isPriceIncrease ? 'text-rose-500' : 'text-gray-900'}`}>
                              KES {cap.currentPriceKES.toLocaleString()}
                            </span>
                          </span>
                          <button
                            onClick={() => handleBuy(item.modelName, cap.capacity, cap.currentPriceKES)}
                            aria-label={`Order ${item.modelName} ${cap.capacity} via WhatsApp`}
                            title="Order via WhatsApp"
                            className="shrink-0 w-9 h-9 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
                          >
                            <WhatsappLogo size={16} weight="fill" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <SealCheck size={44} weight="duotone" className="text-gray-300 mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No models match that search</h3>
            <p className="text-gray-500 font-light mb-8">Looking for something not listed? I can source it.</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi LegitGrinder! I'm looking for a phone not on your pricelist: ${searchTerm}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#0f1a1c] text-white px-10 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors"
            >
              <WhatsappLogo size={18} weight="fill" /> Ask on WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricelist;
