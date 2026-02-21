
import React, { useState, useMemo } from 'react';
import { ShoppingCart, ShieldCheck, Zap, Package, Truck, Clock, CheckCircle2, Search, X } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../constants';
import { PricelistItem } from '../types';

interface PricelistProps {
  pricelist: PricelistItem[];
}

const Pricelist: React.FC<PricelistProps> = ({ pricelist }) => {
  const [activeBrand, setActiveBrand] = useState<'iphone' | 'samsung' | 'pixel'>('iphone');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Title: Change to current month only 1 day into the new month (e.g., changes on the 2nd)
  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < 2 ? 1 : 0), 1);
  const displayMonth = displayDate.toLocaleString('default', { month: 'long' });
  const displayYear = displayDate.getFullYear();
  const listTitle = `${displayMonth} ${displayYear} Price List`;

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
    <div className="bg-mesh min-h-screen pt-32 md:pt-48 pb-32 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-24 animate-in fade-in slide-in-from-top-8 duration-1000">
          <h1 className="text-4xl md:text-8xl font-bold mb-4 md:mb-8 tracking-tighter text-gray-900 leading-none">
            {listTitle}
          </h1>
          <div className="inline-flex items-center gap-2 md:gap-4 glass px-6 md:px-8 py-2 md:py-4 rounded-full border border-indigo-100 shadow-xl shadow-indigo-100/10">
            <Zap className="w-3 md:w-4 h-3 md:h-4 text-indigo-600 fill-indigo-600" />
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-indigo-600">Precision Global Sourcing</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-12">
          <div className="w-full max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search model (e.g. 15 Pro Max)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass border-white/50 border shadow-2xl shadow-gray-100 rounded-[2rem] pl-14 pr-6 py-5 md:py-6 text-sm md:text-lg font-medium outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
            />
          </div>

          <div className="flex justify-center">
            <div className="glass p-1.5 md:p-2 rounded-[2rem] md:rounded-[3rem] flex shadow-2xl shadow-gray-200/30 overflow-x-auto no-scrollbar max-w-full">
              {(['iphone', 'samsung', 'pixel'] as const).map((brand) => (
                <button
                  key={brand}
                  onClick={() => setActiveBrand(brand)}
                  className={`whitespace-nowrap px-8 md:px-16 py-4 md:py-5 rounded-[1.8rem] md:rounded-[2.5rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeBrand === brand
                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200'
                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredModels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {filteredModels.map((item, idx) => (
              <div key={item.id} className="glass p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-white shadow-xl">
                <div className="mb-6 md:mb-10">
                  <span className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] block mb-1 md:mb-2">{item.series}</span>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">{item.modelName}</h3>
                </div>

                <div className="space-y-4">
                  {item.capacities.map((cap, cIdx) => (
                    <div key={cIdx} className="p-4 md:p-6 bg-white/60 rounded-[1.8rem] border border-white/60">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{cap.capacity}</span>
                        <span className="text-lg md:text-xl font-bold text-gray-900">KES {cap.currentPriceKES.toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handleBuy(item.modelName, cap.capacity, cap.currentPriceKES)}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-widest"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Order Item
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <h3 className="text-2xl font-bold text-gray-900">No models found</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricelist;
