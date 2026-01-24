import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Smartphone, CheckCircle, Clock, Link as LinkIcon, ExternalLink, Save } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

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
          brand: variant.products?.brand || 'unknown',
          series: variant.products?.series || '',
          capacity: variant.capacity,
          priceKES: variant.price_kes,
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
    const matchesBrand = selectedBrand === 'all' || item.brand.toLowerCase() === selectedBrand.toLowerCase();
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight-custom">Live Pricelist</h1>
        <p className="text-neutral-400 font-light max-w-2xl mx-auto">
          Real-time market prices for top-tier imports. Prices are subject to change based on global exchange rates.
        </p>
      </div>

      <div className="bg-white rounded-[2rem] p-4 md:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/50 mb-12">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search iPhone, MacBook..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-neutral-50 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#3B8392]/20 transition-all font-medium"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['all', 'apple', 'samsung', 'google'].map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-6 py-3 rounded-xl font-bold text-sm capitalize transition-all whitespace-nowrap ${selectedBrand === brand
                  ? 'bg-neutral-900 text-white shadow-lg'
                  : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                  }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-100">
          <table className="w-full">
            <thead className="bg-neutral-50/50">
              <tr>
                <th className="p-4 md:p-6 text-left text-[10px] md:text-xs font-black uppercase text-neutral-400 tracking-widest">Device</th>
                <th className="p-4 md:p-6 text-left text-[10px] md:text-xs font-black uppercase text-neutral-400 tracking-widest">Price</th>
                <th className="p-4 md:p-6 text-left text-[10px] md:text-xs font-black uppercase text-neutral-400 tracking-widest hidden md:table-cell">Status</th>
                <th className="p-4 md:p-6 text-right text-[10px] md:text-xs font-black uppercase text-neutral-400 tracking-widest">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors group">
                  <td className="p-4 md:p-6">
                    <div className="font-bold text-neutral-900 group-hover:text-[#FF9900] transition-colors">{item.name}</div>
                    <div className="text-xs text-neutral-400 mt-1 flex gap-2">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-[10px] font-bold">{item.capacity}</span>
                      <span className="md:hidden bg-[#3B8392]/10 text-[#3B8392] px-2 py-0.5 rounded text-[10px] font-bold">In Stock</span>
                    </div>
                  </td>
                  <td className="p-4 md:p-6">
                    {item.priceKES ? (
                      <div className="font-bold text-[#3B8392] text-sm md:text-base">
                        KES {item.priceKES.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Pending</span>
                    )}
                  </td>
                  <td className="p-4 md:p-6 hidden md:table-cell">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#3B8392]/10 text-[#3B8392]">
                      In Stock
                    </span>
                  </td>
                  <td className="p-4 md:p-6 text-right text-xs text-neutral-400">
                    {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Pricelist;
