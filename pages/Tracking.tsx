import React, { useState } from 'react';
import { Search, MapPin, Clock, CheckCircle2, Package, Truck, Boxes, Receipt, ArrowRight } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { STATUS_SEQUENCE } from '../constants';

const Tracking: React.FC = () => {
  const [code, setCode] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    setIsSearched(false);
    setOrder(null);
    setInvoice(null);

    try {
      // 1. Search in Invoices first
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select(`*, orders(*)`)
        .eq('id', code.trim())
        .single();

      if (invData) {
        setInvoice(invData);
        setOrder(invData.orders);
        setIsSearched(true);
      } else {
        // 2. Fallback to Orders ID search
        const { data: ordData, error: ordError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', code.trim())
          .single();

        if (ordData) {
          setOrder(ordData);
          setIsSearched(true);
        } else {
          setError('No record found with this ID. Please check your Invoice/Order ID.');
        }
      }
    } catch (err: any) {
      console.error('Tracking error:', err);
      setError('Search failed. Please ensure the Code is correct.');
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order ? STATUS_SEQUENCE.indexOf(order.status) : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 py-20 min-h-screen animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B8392]/5 rounded-full mb-6 border border-[#3B8392]/10">
          <Receipt className="w-4 h-4 text-[#3B8392]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#3B8392]">Instant Invoice Tracking</span>
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tight text-neutral-900">Track Packages</h1>
        <p className="text-neutral-500 font-light text-lg">Enter your Invoice ID or Order ID for real-time logistics sync.</p>
      </div>

      <div className="max-w-xl mx-auto mb-16">
        <div className="relative group">
          <input
            type="text"
            placeholder="INV-XXXX or ORD-XXXX"
            className="w-full bg-white border-2 border-neutral-100 rounded-[2rem] px-8 py-6 text-xl font-bold text-center focus:border-[#3B8392] outline-none transition-all shadow-2xl shadow-neutral-100 group-hover:shadow-[#3B8392]/5"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="absolute right-4 top-4 bottom-4 bg-neutral-900 text-white px-8 rounded-2xl hover:bg-[#3B8392] transition-all flex items-center justify-center shadow-xl"
          >
            {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-12 p-6 bg-red-50 text-red-600 rounded-[2rem] text-center font-bold border border-red-100 animate-in zoom-in-95">
          {error}
        </div>
      )}

      {isSearched && order && (
        <div className="animate-in slide-in-from-bottom-12 duration-1000">
          <div className="bg-white rounded-[4rem] shadow-2xl shadow-neutral-200 border border-neutral-50 p-10 md:p-16 mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B8392]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 relative z-10">
              <div>
                <span className="text-[10px] font-black text-[#3B8392] bg-[#3B8392]/5 px-4 py-2 rounded-full uppercase tracking-widest border border-[#3B8392]/10">Logistics Verified</span>
                <h2 className="text-4xl font-black mt-4 tracking-tighter">Order #{order.id}</h2>
                <div className="flex items-center text-neutral-400 mt-2 space-x-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Synced: {new Date(order.date_placed || order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex bg-neutral-50 p-6 rounded-[2rem] gap-8">
                <div className="text-right">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-1">Method</p>
                  <p className="font-bold text-neutral-900">{order.mode || 'Air'}</p>
                </div>
                <div className="w-px h-10 bg-neutral-200"></div>
                <div className="text-right">
                  <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-1">Source</p>
                  <p className="font-bold text-neutral-900">{order.origin || 'Global'}</p>
                </div>
              </div>
            </div>

            {/* Premium Stepper */}
            <div className="relative pb-10">
              <div className="absolute top-6 left-1 right-1 h-1.5 bg-neutral-100 rounded-full z-0"></div>
              <div
                className="absolute top-6 left-1 h-1.5 bg-[#3B8392] rounded-full z-0 transition-all duration-1000 shadow-[0_0_15px_rgba(59,131,146,0.3)]"
                style={{ width: `${(currentIdx / (STATUS_SEQUENCE.length - 1)) * 100}%` }}
              ></div>

              <div className="relative z-10 flex justify-between">
                {STATUS_SEQUENCE.map((status, i) => (
                  <div key={status} className="flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl transition-all duration-700 ${i <= currentIdx ? 'bg-[#3B8392] text-white scale-110' : 'bg-white text-neutral-300'
                      }`}>
                      {i < currentIdx ? <CheckCircle2 className="w-6 h-6" /> : (i === 0 ? <Package className="w-6 h-6" /> : (i === 2 ? <Truck className="w-6 h-6" /> : <Boxes className="w-6 h-6" />))}
                    </div>
                    <p className={`mt-6 text-[10px] uppercase font-black tracking-widest text-center max-w-[100px] transition-colors ${i <= currentIdx ? 'text-[#3B8392]' : 'text-neutral-300'
                      }`}>
                      {status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-[3rem] p-10 flex flex-col md:flex-row shadow-2xl shadow-neutral-200 items-center justify-between border border-neutral-800">
            <div className="flex items-center space-x-6 mb-8 md:mb-0">
              <div className="bg-[#3B8392] p-5 rounded-[1.5rem] text-white shadow-2xl shadow-[#3B8392]/20">
                <MapPin className="w-7 h-7" />
              </div>
              <div className="text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3B8392] mb-1">Global Hub Milestone</p>
                <p className="text-2xl font-bold">{order.status}</p>
                {invoice && <p className="text-sm text-neutral-500 mt-1 font-mono uppercase tracking-tighter">Verified by Invoice {invoice.id}</p>}
              </div>
            </div>
            <button className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2 group">
              Support <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
