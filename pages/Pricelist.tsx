import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Smartphone, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      // Join products and product_variants
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          capacity,
          price_kes,
          last_updated,
          status,
          products (
            brand,
            name,
            series
          )
        `);

      if (error) throw error;

      if (data) {
        const mapped: DisplayItem[] = data.map((item: any) => ({
          id: item.id,
          name: item.products?.name || 'Unknown',
          brand: item.products?.brand || 'unknown',
          series: item.products?.series || '',
          capacity: item.capacity,
          priceKES: item.price_kes,
          lastUpdated: item.last_updated,
          status: item.status
        }));
        setItems(mapped);
      }
    } catch (err) {
      console.error('Error fetching prices:', err);
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
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Model</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Capacity</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Price (KES)</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Last Updated</th>
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
                        <span className="font-bold text-[#FF9900]">
                          KES {item.priceKES.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Pending...</span>
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
