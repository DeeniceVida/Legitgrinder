
import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ShoppingCart, Minus, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { WHATSAPP_NUMBER, PHONE_MODELS_SCHEMA } from '../constants';

const Pricelist: React.FC = () => {
  const [activeBrand, setActiveBrand] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  // MOCK DATA: In a real app, this would be provided via Context or State management from the scraper
  const mockSyncData: Record<string, any> = {
    'iPhone 15 Pro Max-256GB': { price: 165400, trend: 'reduced' },
    'iPhone 15 Pro Max-512GB': { price: 182000, trend: 'stable' },
    'iPhone 15 Pro Max-1TB': { price: 205000, trend: 'increased' },
    'iPhone 15 Pro-128GB': { price: 142000, trend: 'reduced' },
    'iPhone 15 Pro-256GB': { price: 155000, trend: 'stable' },
    'S24 Ultra-256GB': { price: 158000, trend: 'reduced' },
    'Pixel 9 Pro-128GB': { price: 118000, trend: 'stable' },
  };

  const handleBuy = (model: string, capacity: string) => {
    const data = mockSyncData[`${model}-${capacity}`];
    const text = encodeURIComponent(`Hi LegitGrinder, I'm ordering the ${model} (${capacity}) - Good Condition. Listed Price: KES ${data?.price.toLocaleString()}.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto py-24 px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="text-center mb-24">
        <h1 className="text-6xl md:text-8xl font-medium mb-8 tracking-tight-custom">
          Legit<span className="italic heading-accent text-neutral-400 group-hover:text-[#FF9900] transition-colors">Pricelist.</span>
        </h1>
        <div className="flex flex-col items-center gap-6">
          <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.3em] bg-neutral-50 inline-block px-10 py-4 rounded-full border border-neutral-100 shadow-sm">
            {currentMonth} Global Market Sync
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-400 font-light">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /> Only "Good" Condition</span>
            <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full"></span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-[#FF9900]" /> Automated Scraper (v1.2)</span>
          </div>
        </div>
      </div>

      {/* Brand Navigation */}
      <div className="flex justify-center mb-20">
        <div className="bg-neutral-50 p-2.5 rounded-[2.5rem] flex shadow-inner">
          {(['iphone', 'samsung', 'pixel'] as const).map((brand) => (
            <button
              key={brand}
              onClick={() => setActiveBrand(brand)}
              className={`px-14 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                activeBrand === brand 
                  ? 'bg-white shadow-2xl text-neutral-900' 
                  : 'text-neutral-400 hover:text-[#FF9900]'
              }`}
            >
              {brand === 'pixel' ? 'Google Pixel' : brand}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {PHONE_MODELS_SCHEMA[activeBrand].map((model) => (
          <div key={model.name} className="bg-white border border-neutral-100 rounded-[3rem] p-12 hover:shadow-[0_40px_80px_-20px_rgba(255,153,0,0.1)] hover:border-[#FF9900]/20 transition-all duration-700 group flex flex-col h-full">
            <div className="flex justify-between items-start mb-12">
              <div>
                <span className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.3em] block mb-3 group-hover:text-[#FF9900] transition-colors">{model.series}</span>
                <h3 className="text-3xl font-medium text-neutral-900 tracking-tight-custom">{model.name}</h3>
              </div>
              <div className="p-4 bg-neutral-50 rounded-[1.5rem] text-neutral-200 group-hover:text-[#FF9900] group-hover:bg-[#FF9900]/5 transition-all duration-500">
                <Smartphone className="w-7 h-7" />
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {model.capacities.map((cap) => {
                const data = mockSyncData[`${model.name}-${cap}`];
                return (
                  <div key={cap} className="flex justify-between items-center p-6 bg-neutral-50 rounded-[1.8rem] hover:bg-white hover:shadow-xl hover:shadow-neutral-100 border border-transparent hover:border-neutral-100 transition-all duration-300">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{cap}</span>
                      {data?.trend === 'reduced' && <span className="text-[8px] font-black text-green-500 uppercase mt-1 flex items-center gap-1"><ArrowDown className="w-2.5 h-2.5" /> Price Drop</span>}
                    </div>
                    
                    <div className="flex items-center gap-5">
                      {data ? (
                        <>
                          <span className="text-lg font-bold text-neutral-900">KES {data.price.toLocaleString()}</span>
                          <button 
                            onClick={() => handleBuy(model.name, cap)}
                            className="btn-brand bg-white p-3 rounded-[1rem] border border-neutral-200 shadow-sm text-neutral-300 hover:text-white"
                          >
                            <ShoppingCart className="w-4.5 h-4.5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">Out of Stock</span>
                           <span className="text-[8px] text-neutral-300 mt-1 italic">Manual Quote</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 pt-8 border-t border-neutral-50 flex justify-center gap-4">
               <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Good Condition</span>
               <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Scraped</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Note */}
      <div className="mt-32 max-w-4xl mx-auto p-12 bg-neutral-50 rounded-[3.5rem] border border-neutral-100 text-center hover:bg-white hover:shadow-2xl transition-all duration-700 group">
         <h2 className="text-3xl font-medium mb-6 tracking-tight-custom group-hover:text-[#FF9900]">Transparency in Pricing</h2>
         <p className="text-neutral-500 font-light text-lg leading-relaxed mb-10">
           Our system scrapes BackMarket USA every 21 days, selecting only the <span className="text-neutral-900 font-medium">"Good" condition</span> variant for the best value. 
           The final KES price includes: $8 base fee, shipping ($20 + 3.5%), and our service fee. Conversion is locked at 135 KES/USD for consistency.
         </p>
         <button className="text-neutral-900 font-bold text-xs uppercase tracking-[0.2em] border-b-2 border-neutral-900 pb-1 hover:text-[#FF9900] hover:border-[#FF9900] transition-all">Detailed Fee Architecture</button>
      </div>
    </div>
  );
};

export default Pricelist;
