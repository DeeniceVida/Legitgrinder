
import React, { useState } from 'react';
import { Search, MapPin, Clock, CheckCircle2, Package, Truck, Boxes } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { STATUS_SEQUENCE } from '../constants';
import { OrderStatus } from '../types';

const Tracking: React.FC = () => {
  const [code, setCode] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    setIsSearched(false);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', code)
        .single();

      if (error) throw error;

      if (data) {
        setOrder(data);
        setIsSearched(true);
      } else {
        setError('Order not found. Please check your code.');
      }
    } catch (err: any) {
      console.error('Tracking error:', err);
      setError('Order not found or invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order ? STATUS_SEQUENCE.indexOf(order.status) : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 tracking-tight">Live Tracking</h1>
        <p className="text-gray-500">Enter your order ID to track status.</p>
      </div>

      <div className="max-w-md mx-auto mb-12">
        <div className="relative group">
          <input
            type="text"
            placeholder="e.g. 123e4567..."
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-5 text-lg font-bold text-center focus:border-[#FF9900] outline-none transition-all shadow-lg group-hover:shadow-xl"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="absolute right-3 top-3 bottom-3 bg-[#FF9900] text-white px-6 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center"
          >
            {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 text-red-600 rounded-xl text-center font-bold">
          {error}
        </div>
      )}

      {isSearched && order && (
        <div className="animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 md:p-12 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <span className="text-xs font-bold text-[#FF9900] bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">Tracking Active</span>
                <h2 className="text-3xl font-black mt-2">Order #{order.id.slice(0, 8)}</h2>
                <div className="flex items-center text-gray-500 mt-2 space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Placed: {new Date(order.date_placed).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Origin</p>
                  <p className="font-bold">{order.origin || 'USA'}</p>
                </div>
                <div className="w-px h-10 bg-gray-100"></div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Product</p>
                  <p className="font-bold">{order.product_name}</p>
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0"></div>
              <div
                className="absolute top-5 left-0 h-0.5 bg-[#FF9900] z-0 transition-all duration-1000"
                style={{ width: `${(currentIdx / (STATUS_SEQUENCE.length - 1)) * 100}%` }}
              ></div>

              <div className="relative z-10 flex justify-between">
                {STATUS_SEQUENCE.map((status, i) => (
                  <div key={status} className="flex flex-col items-center group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-all ${i <= currentIdx ? 'bg-[#FF9900] text-white scale-110' : 'bg-gray-100 text-gray-400'
                      }`}>
                      {i < currentIdx ? <CheckCircle2 className="w-5 h-5" /> : (i === 0 ? <Package className="w-5 h-5" /> : (i === 2 ? <Truck className="w-5 h-5" /> : <Boxes className="w-5 h-5" />))}
                    </div>
                    <p className={`mt-4 text-[10px] md:text-xs font-bold text-center max-w-[80px] transition-colors ${i <= currentIdx ? 'text-[#FF9900]' : 'text-gray-400'
                      }`}>
                      {status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-3xl p-6 flex items-center justify-between border border-orange-100">
            <div className="flex items-center space-x-4">
              <div className="bg-[#FF9900] p-3 rounded-2xl text-white shadow-lg shadow-orange-200">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-orange-900">Current Status</p>
                <p className="text-sm text-orange-700">{order.status} - {order.mode || 'Air'} Freight</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
