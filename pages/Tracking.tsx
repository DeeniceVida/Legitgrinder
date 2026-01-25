
import React, { useState } from 'react';
import { Search, MapPin, Clock, CheckCircle2, Package, Truck, Boxes, Lock, ArrowRight } from 'lucide-react';
import { STATUS_SEQUENCE } from '../constants';
import { OrderStatus, Invoice } from '../types';

interface TrackingProps {
  isLoggedIn: boolean;
  onNavigate: (page: string) => void;
  invoices: Invoice[];
}

const Tracking: React.FC<TrackingProps> = ({ isLoggedIn, onNavigate, invoices }) => {
  const [invoiceInput, setInvoiceInput] = useState('');
  const [searchedInvoice, setSearchedInvoice] = useState<Invoice | null>(null);

  const handleSearch = () => {
    const found = invoices.find(inv => inv.invoiceNumber === invoiceInput);
    setSearchedInvoice(found || null);
  };

  return (
    <div className="bg-mesh min-h-screen pt-48 pb-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 tracking-tight">Live Tracking</h1>
          <p className="text-gray-500 text-lg">Enter your Invoice/Receipt number to track your global shipment.</p>
        </div>

        <div className="max-w-md mx-auto mb-20">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="e.g. 4932"
              className="w-full bg-white border-none rounded-3xl px-8 py-6 text-2xl font-bold tracking-[0.2em] text-center focus:ring-4 focus:ring-[#3D8593]/10 outline-none transition-all shadow-2xl"
              value={invoiceInput}
              onChange={(e) => setInvoiceInput(e.target.value)}
            />
            <button 
              onClick={handleSearch}
              className="absolute right-3 top-3 bottom-3 bg-[#3D8593] text-white px-8 rounded-2xl hover:bg-[#FF9900] transition-all shadow-lg"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {searchedInvoice && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[3.5rem] shadow-2xl border border-neutral-100 p-10 md:p-14 mb-10 overflow-hidden relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                <div>
                  <span className="text-[10px] font-black text-[#3D8593] bg-teal-50 px-4 py-1.5 rounded-full uppercase tracking-widest">Invoice Found</span>
                  <h2 className="text-4xl font-bold mt-4">Invoice #{searchedInvoice.invoiceNumber}</h2>
                  <div className="flex items-center text-gray-400 mt-3 space-x-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Last update: {searchedInvoice.lastUpdate}</span>
                  </div>
                </div>
                <div className="bg-neutral-50 p-6 rounded-3xl min-w-[200px]">
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Current Status</p>
                   <p className="text-xl font-bold text-gray-900">{searchedInvoice.status}</p>
                </div>
              </div>

              {isLoggedIn ? (
                <div className="relative pt-10">
                  <div className="absolute top-[6.5rem] left-0 right-0 h-1 bg-neutral-100 rounded-full"></div>
                  <div 
                    className="absolute top-[6.5rem] left-0 h-1 bg-[#3D8593] rounded-full transition-all duration-1000 shadow-lg shadow-teal-100" 
                    style={{ width: `${searchedInvoice.progress}%` }}
                  ></div>
                  
                  <div className="relative z-10 flex justify-between">
                    {STATUS_SEQUENCE.map((status, i) => {
                      const statusIdx = STATUS_SEQUENCE.indexOf(searchedInvoice.status);
                      const isPast = i <= statusIdx;
                      return (
                        <div key={status} className="flex flex-col items-center group">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl transition-all ${
                            isPast ? 'bg-[#3D8593] text-white scale-110' : 'bg-neutral-50 text-neutral-300'
                          }`}>
                            {i < statusIdx ? <CheckCircle2 className="w-6 h-6" /> : (i === 0 ? <Package className="w-6 h-6" /> : (i === statusIdx ? <Truck className="w-6 h-6 animate-pulse" /> : <Boxes className="w-6 h-6" />))}
                          </div>
                          <p className={`mt-6 text-[10px] font-black uppercase tracking-widest text-center max-w-[90px] ${
                            isPast ? 'text-[#3D8593]' : 'text-neutral-300'
                          }`}>
                            {status}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-10 p-12 bg-neutral-50 rounded-[2.5rem] border-2 border-dashed border-neutral-200 text-center relative group">
                   <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-transform">
                        <Lock className="w-8 h-8 text-[#3D8593]" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4">Detailed tracking is locked</h3>
                      <p className="text-gray-500 font-light leading-relaxed mb-8">
                        Guests can only see text status updates. Sign up to unlock the visual progression bar, real-time map tracking, and historical logs.
                      </p>
                      <button 
                        onClick={() => onNavigate('login')}
                        className="btn-vibrant-teal px-10 py-4 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"
                      >
                        Create Account <ArrowRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
