import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Smartphone, CheckCircle, Clock, Link as LinkIcon, ExternalLink, Save, MessageCircle } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { WHATSAPP_NUMBER } from '../constants';

interface DisplayItem {
  id: number;
  name: string;
  brand: string;
  series: string;
  capacity: string;
  priceKES: number | null;
  prevPrice: number | null;
  lastUpdated: string | null;
  status: string;
}

const Pricelist = () => {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');

  useEffect(() => {
    fetchPricelist();
  }, []);

  const fetchPricelist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`*, products(id, name, series, brand)`)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching pricelist:', error);
        return;
      }

      if (data) {
        const mapped = data.map((variant: any) => ({
          id: variant.id,
          productId: variant.product_id,
          name: variant.products?.name || 'Unknown',
          brand: (variant.products?.brand || 'unknown').toLowerCase(),
          series: variant.products?.series || '',
          capacity: variant.capacity,
          priceKES: variant.price_kes,
          prevPrice: variant.previous_price_kes,
          status: variant.status,
          lastUpdated: variant.last_updated,
        }));
        setItems(mapped);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedBrand === 'all') return matchesSearch;

    // Brand normalization for filtering
    const brand = item.brand.toLowerCase();
    const name = item.name.toLowerCase();

    if (selectedBrand === 'apple') {
      return matchesSearch && (brand.includes('apple') || name.includes('iphone') || name.includes('macbook'));
    }
    if (selectedBrand === 'samsung') {
      return matchesSearch && (brand.includes('samsung') || name.includes('galaxy'));
    }
    if (selectedBrand === 'pixel') {
      return matchesSearch && (brand.includes('google') || name.includes('pixel'));
    }

    return matchesSearch && brand === selectedBrand;
  });

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getPriceColor = (current: number | null, prev: number | null) => {
    if (!current || !prev || current === prev) return 'text-[#3B8392]';
    return current < prev ? 'text-green-600' : 'text-red-500';
  };

  const handleBuyNow = (item: DisplayItem) => {
    const text = encodeURIComponent(
      `Hi LegitGrinder, I'm interested in buying:\n\n` +
      `Product: ${item.name}\n` +
      `Capacity: ${item.capacity}\n` +
      `Price: KES ${item.priceKES?.toLocaleString()}\n\n` +
      `Please let me know the next steps.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-12 animate-in fade-in duration-1000">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight-custom text-neutral-900 leading-tight">
          Live Pricelist <span className="text-[#3B8392] italic">{currentMonthYear}</span>
        </h1>
        <p className="text-neutral-400 font-light max-w-2xl mx-auto text-lg leading-relaxed">
          Real-time market rates for global tech imports. <br className="hidden md:block" />
          <span className="text-green-600 font-bold">Green</span> indicates price drops. <span className="text-red-500 font-bold">Red</span> indicates increases.
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] p-4 md:p-10 border border-neutral-100 shadow-2xl shadow-neutral-200/50 mb-12 animate-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-10">
          <div className="relative w-full md:w-[450px] group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5 group-focus-within:text-[#3B8392] transition-colors" />
            <input
              type="text"
              placeholder="Search devices, accessories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-neutral-50/50 rounded-2xl outline-none border border-transparent focus:bg-white focus:border-[#3B8392]/30 focus:ring-4 focus:ring-[#3B8392]/5 transition-all font-medium text-neutral-900"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {['all', 'apple', 'samsung', 'pixel'].map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap min-w-[120px] ${selectedBrand === brand
                    ? 'bg-neutral-900 text-white shadow-xl scale-105'
                    : 'bg-white text-neutral-400 border border-neutral-100 hover:border-[#3B8392]/40 hover:text-[#3B8392]'
                  }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-neutral-50/30">
          <table className="w-full border-collapse">
            <thead className="bg-neutral-50/50">
              <tr>
                <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-100">Device Model</th>
                <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-100">Market Price</th>
                <th className="p-6 text-right text-[10px] font-black uppercase text-neutral-400 tracking-widest border-b border-neutral-100">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-20 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#3B8392] opacity-20" />
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white transition-all group">
                    <td className="p-6">
                      <div className="font-bold text-neutral-900 group-hover:text-[#FF9900] transition-colors duration-300 text-lg md:text-xl tracking-tight-custom">{item.name}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="bg-white border border-neutral-100 px-3 py-1 rounded-lg text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <Smartphone className="w-3 h-3" /> {item.capacity}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-tighter">Est. Delivery: 3 Weeks</span>
                      </div>
                    </td>
                    <td className="p-6">
                      {item.priceKES ? (
                        <div className="space-y-1">
                          <div className={`font-black text-lg md:text-2xl tracking-tighter transition-all duration-500 scale-100 group-hover:scale-105 origin-left ${getPriceColor(item.priceKES, item.prevPrice)}`}>
                            KES {item.priceKES.toLocaleString()}
                          </div>
                          {item.prevPrice && item.priceKES !== item.prevPrice && (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold uppercase tracking-tighter ${item.priceKES < item.prevPrice ? 'text-green-500' : 'text-red-400'}`}>
                                {item.priceKES < item.prevPrice ? '▼ Price Drop' : '▲ Market Surge'}
                              </span>
                              <span className="text-[10px] text-neutral-300 line-through">KES {item.prevPrice.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-300 font-medium italic">Contact for Quote</span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <button
                        onClick={() => handleBuyNow(item)}
                        className="inline-flex items-center gap-2 bg-[#FF9900] text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-900 hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-orange-100 group-hover:shadow-orange-200"
                      >
                        <MessageCircle className="w-4 h-4" /> Buy Now
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-20 text-center text-neutral-400 font-light italic">
                    No devices found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
        {[
          { icon: <RefreshCw />, title: "Live Updates", desc: "Prices synced daily with global market shifts." },
          { icon: <Smartphone />, title: "Authentic Tech", desc: "Factory unlocked and verified authentic products." },
          { icon: <Clock />, title: "3-Week Delivery", desc: "Safe shipping from US/UK hubs to your doorstep." }
        ].map((feature, i) => (
          <div key={i} className="space-y-4 p-8 bg-neutral-50 rounded-[2rem] border border-transparent hover:border-neutral-100 transition-all">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-[#3B8392] shadow-sm mb-6">
              {React.cloneElement(feature.icon as React.ReactElement, { className: "w-6 h-6" })}
            </div>
            <h4 className="font-bold text-neutral-900">{feature.title}</h4>
            <p className="text-sm text-neutral-400 font-light leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricelist;
