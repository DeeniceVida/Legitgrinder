import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface DisplayItem {
  id: number; // variant id
  name: string;
  brand: string;
  series: string;
  capacity: string;
  priceKES: number | null;
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
      // Join products and product_variants
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          products (
            id,
            name,
            series,
            brand
          )
        `)
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
          brand: variant.products?.brand || 'unknown', // Added brand from products
          series: variant.products?.series || '', // Added series from products
          capacity: variant.capacity,
          priceKES: variant.price_kes,
          priceUSD: variant.price_usd,
          status: variant.status,
          lastUpdated: variant.last_updated,
          sourceUrl: variant.source_url,
          previous_price_kes: variant.previous_price_kes
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
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.series.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || item.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Live Price List</h1>
        <p className="text-gray-600">Real-time pricing from our automated import system.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['all', 'iphone', 'samsung', 'pixel'].map(brand => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-6 py-3 rounded-xl capitalize whitespace-nowrap transition-colors ${selectedBrand === brand
                ? 'bg-[#1a1a1a] text-white'
                : 'bg-white border border-gray-200 hover:border-[#FF9900] text-gray-600'
                }`}
            >
              {brand}
            </button>
          ))}
        </div>
        <button
          onClick={fetchPrices}
          className="p-3 rounded-xl border border-gray-200 hover:border-[#FF9900] hover:text-[#FF9900] transition-colors"
          title="Refresh Prices"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="border-b border-neutral-100">
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-neutral-400">Model</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-neutral-400">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-neutral-400">Price (KES)</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-neutral-400">Action</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-neutral-400">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-neutral-400">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">{item.series}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {item.capacity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.priceKES ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#FF9900]">
                            KES {item.priceKES.toLocaleString()}
                          </span>
                          {(item as any).previous_price_kes && (item as any).previous_price_kes !== item.priceKES && (
                            <span className={`text-xs font-bold flex items-center gap-1 ${item.priceKES < (item as any).previous_price_kes ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {item.priceKES < (item as any).previous_price_kes ? '↓' : '↑'}
                              {Math.abs(((item.priceKES - (item as any).previous_price_kes) / (item as any).previous_price_kes * 100)).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Pending...</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.priceKES ? (
                        <button
                          onClick={() => {
                            // Navigate to contact/order form with pre-filled product info
                            const productName = `${(item as any).products?.name} ${item.capacity}`;
                            const price = item.priceKES;
                            window.location.href = `/contact?product=${encodeURIComponent(productName)}&price=${price}`;
                          }}
                          className="px-4 py-2 bg-[#FF9900] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 transition-all hover:scale-105 active:scale-95"
                        >
                          Buy Now
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-400">Not Available</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'out_of_stock' ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                          <Clock className="w-4 h-4" /> Out of Stock
                        </span>
                      ) : item.priceKES ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" /> Available
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Waiting for Sync</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Loading prices...' : 'No products found matching your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Pricelist;
