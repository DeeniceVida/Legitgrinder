
import React, { useState } from 'react';
import { Search, MapPin, Clock, CheckCircle2, Package, Truck, Boxes } from 'lucide-react';
import { STATUS_SEQUENCE } from '../constants';
import { OrderStatus } from '../types';

const Tracking: React.FC = () => {
  const [code, setCode] = useState('');
  const [isSearched, setIsSearched] = useState(false);

  // Mock tracking data
  const mockOrder = {
    id: '4932',
    status: OrderStatus.SHIPPING,
    lastUpdate: '2 hours ago',
    origin: 'Shenzhen, China',
    dest: 'Nairobi, CBD',
    mode: 'Air Freight'
  };

  const currentIdx = STATUS_SEQUENCE.indexOf(mockOrder.status);

  return (
    <div className="max-w-4xl mx-auto p-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 tracking-tight">Live Tracking</h1>
        <p className="text-gray-500">Enter your 4-digit unique tracking code provided on your receipt.</p>
      </div>

      <div className="max-w-md mx-auto mb-12">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="e.g. 4932"
            maxLength={4}
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-5 text-2xl font-bold tracking-[0.5em] text-center focus:border-blue-500 outline-none transition-all shadow-lg group-hover:shadow-xl"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <button 
            onClick={() => setIsSearched(true)}
            className="absolute right-3 top-3 bottom-3 bg-blue-600 text-white px-6 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isSearched && (
        <div className="animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 md:p-12 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Tracking Active</span>
                <h2 className="text-3xl font-black mt-2">Order #{mockOrder.id}</h2>
                <div className="flex items-center text-gray-500 mt-2 space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Last update: {mockOrder.lastUpdate}</span>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Origin</p>
                  <p className="font-bold">{mockOrder.origin}</p>
                </div>
                <div className="w-px h-10 bg-gray-100"></div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Destination</p>
                  <p className="font-bold">{mockOrder.dest}</p>
                </div>
              </div>
            </div>

            {/* Stepper */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 z-0"></div>
              <div 
                className="absolute top-5 left-0 h-0.5 bg-blue-600 z-0 transition-all duration-1000" 
                style={{ width: `${(currentIdx / (STATUS_SEQUENCE.length - 1)) * 100}%` }}
              ></div>
              
              <div className="relative z-10 flex justify-between">
                {STATUS_SEQUENCE.map((status, i) => (
                  <div key={status} className="flex flex-col items-center group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-all ${
                      i <= currentIdx ? 'bg-blue-600 text-white scale-110' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i < currentIdx ? <CheckCircle2 className="w-5 h-5" /> : (i === 0 ? <Package className="w-5 h-5" /> : (i === 2 ? <Truck className="w-5 h-5" /> : <Boxes className="w-5 h-5" />))}
                    </div>
                    <p className={`mt-4 text-[10px] md:text-xs font-bold text-center max-w-[80px] transition-colors ${
                      i <= currentIdx ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-3xl p-6 flex items-center justify-between border border-blue-100">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-blue-900">Est. Arrival in Nairobi</p>
                <p className="text-sm text-blue-700">June 24th, 2024 via {mockOrder.mode}</p>
              </div>
            </div>
            <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition-colors">Details</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
