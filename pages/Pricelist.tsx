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

      if (error) throw error;

      if (data) {
        setItems(data.map((variant: any) => ({
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
        })));
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
    const brand = item.brand.toLowerCase();
    const name = item.name.toLowerCase();
    if (selectedBrand === 'apple') return matchesSearch && (brand.includes('apple') || name.includes('iphone') || name.includes('macbook'));
    if (selectedBrand === 'samsung') return matchesSearch && (brand.includes('samsung') || name.includes('galaxy'));
    if (selectedBrand === 'pixel') return matchesSearch && (brand.includes('google') || name.includes('pixel'));
    return matchesSearch && brand === selectedBrand;
  });

  const getPriceColor = (current: number | null, prev: number | null) => {
    if (!current || !prev || current === prev) return 'text-[#3B8392]';
    return current < prev ? 'text-green-600' : 'text-red-500';
  };

  const handleBuyNow = (item: DisplayItem) => {
    const text = encodeURIComponent(`Hi LegitGrinder, I'm interested in buying ${item.name} (${item.capacity}) for KES ${item.priceKES?.toLocaleString()}.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-12 animate-in fade-in duration-1000">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight-custom text-neutral-900 leading-tight">
          Live Pricelist <span className="text-[#3B8392] italic">{currentMonthYear}</span>
        </h1>
        <p className="text-neutral-400 font-light max-w-2xl mx-auto text-lg leading-relaxed mb-8">
          Daily market rates. <span className="text-green-600 font-bold">Green</span>: Price Drop. <span className="text-red-500 font-bold">Red</span>: Market Surge.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#3B8392]/5 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar scroll-smooth">
            {['all', 'apple', 'samsung', 'pixel'].map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all min-w-[100px] border ${selectedBrand === brand ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-400 border-neutral-100'
                  }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-2xl shadow-neutral-200/50 overflow-hidden">
        {/* Table View (Desktop) */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead className="bg-neutral-50/50">
              <tr>
                <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest">Device Model</th>
                <th className="p-6 text-left text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Price Status</th>
                <th className="p-6 text-right text-[10px] font-black uppercase text-neutral-400 tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan={3} className="p-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#3B8392]/20" /></td></tr>
              ) : filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="font-bold text-neutral-900 group-hover:text-[#FF9900] transition-colors">{item.name}</div>
                    <div className="text-[10px] font-bold text-neutral-400 mt-1 uppercase bg-neutral-100 px-2 py-0.5 rounded inline-block">{item.capacity}</div>
                  </td>
                  <td className="p-6 text-center">
                    <div className={`font-black text-xl tracking-tighter ${getPriceColor(item.priceKES, item.prevPrice)}`}>
                      KES {item.priceKES?.toLocaleString()}
                    </div>
                    {item.prevPrice && item.priceKES !== item.prevPrice && (
                      <div className={`text-[10px] font-black uppercase tracking-tighter mt-1 ${item.priceKES < item.prevPrice ? 'text-green-500' : 'text-red-400'}`}>
                        {item.priceKES < item.prevPrice ? '▼ Dropped' : '▲ Increased'}
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => handleBuyNow(item)} className="bg-[#FF9900] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-100 hover:bg-neutral-900 transition-all">Buy Now</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden divide-y divide-neutral-100">
          {loading ? (
            <div className="p-20 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#3B8392]/20" /></div>
          ) : filteredItems.map(item => (
            <div key={item.id} className="p-6 bg-white flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-neutral-900 leading-tight mb-1 text-lg">{item.name}</div>
                  <div className="bg-neutral-100 px-2 py-0.5 rounded text-[10px] font-black text-neutral-400 uppercase tracking-widest inline-block">{item.capacity}</div>
                </div>
                <div className="text-right">
                  <div className={`font-black text-lg ${getPriceColor(item.priceKES, item.prevPrice)}`}>KES {item.priceKES?.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-neutral-300 uppercase mt-1">EST: 3 Weeks</div>
                </div>
              </div>
              <button onClick={() => handleBuyNow(item)} className="w-full bg-[#FF9900] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100">Buy Now on WhatsApp</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricelist;
