
import React, { useState, useEffect } from 'react';
import { Smartphone, Package, Mail, MessageCircle } from 'lucide-react';
import { KES_PER_USD, FEE_STRUCTURE, WHATSAPP_NUMBER } from '../constants';
import { CalculationResult } from '../types';

const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'us-phone' | 'general'>('us-phone');
  
  const [phonePriceUSD, setPhonePriceUSD] = useState<string>('');
  const [phoneUrl, setPhoneUrl] = useState<string>('');
  const [usPhoneResult, setUsPhoneResult] = useState<CalculationResult | null>(null);

  // Use correct FEE_STRUCTURE property names
  useEffect(() => {
    if (!phonePriceUSD || isNaN(Number(phonePriceUSD))) {
      setUsPhoneResult(null);
      return;
    }

    const price = Number(phonePriceUSD);
    const buyingPriceKES = price * KES_PER_USD;
    const shippingFeeUSD = FEE_STRUCTURE.SHIPPING_FLAT_USD + (price * FEE_STRUCTURE.SHIPPING_PERCENT);
    const shippingFeeKES = shippingFeeUSD * KES_PER_USD;

    let serviceFeeUSD = FEE_STRUCTURE.SERVICE_FEE_FIXED_USD;
    if (price > FEE_STRUCTURE.THRESHOLD_USD) {
      serviceFeeUSD = price * FEE_STRUCTURE.SERVICE_FEE_PERCENT_LARGE;
    }
    const serviceFeeKES = serviceFeeUSD * KES_PER_USD;

    setUsPhoneResult({
      buyingPriceKES,
      shippingFeeKES,
      serviceFeeKES,
      totalKES: buyingPriceKES + shippingFeeKES + serviceFeeKES
    });
  }, [phonePriceUSD]);

  const handleShareWhatsApp = (type: string, res: CalculationResult) => {
    const text = encodeURIComponent(
      `Hi LegitGrinder, I'd like to place an order for ${type}.\n\n` +
      `Product Link: ${phoneUrl || 'Not provided'}\n` +
      `Total: KES ${res.totalKES.toLocaleString()}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto p-6 py-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-6xl font-medium mb-6 tracking-tight-custom text-neutral-900">Import Calculator</h1>
        <p className="text-neutral-500 text-lg font-light">Accurate quotes based on real-time market rates.</p>
      </div>

      <div className="flex justify-center mb-16">
        <div className="bg-neutral-50 p-1.5 rounded-full flex shadow-inner">
          <button 
            onClick={() => setActiveTab('us-phone')}
            className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'us-phone' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-[#FF9900]'}`}
          >
            US Tech
          </button>
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-[#FF9900]'}`}
          >
            General Imports
          </button>
        </div>
      </div>

      {activeTab === 'us-phone' ? (
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-10">
            <h2 className="text-2xl font-medium text-neutral-900">Order Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Product Link</label>
                <input 
                  type="url" 
                  placeholder="eBay, Backmarket, etc."
                  className="w-full bg-neutral-50 border border-transparent rounded-2xl px-6 py-5 focus:bg-white focus:border-[#FF9900]/30 focus:ring-4 focus:ring-[#FF9900]/5 outline-none transition-all text-neutral-900 placeholder:text-neutral-300"
                  value={phoneUrl}
                  onChange={(e) => setPhoneUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Item Value ($ USD)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full bg-neutral-50 border border-transparent rounded-2xl px-6 py-6 focus:bg-white focus:border-[#FF9900]/30 focus:ring-4 focus:ring-[#FF9900]/5 outline-none transition-all text-3xl font-medium text-neutral-900"
                  value={phonePriceUSD}
                  onChange={(e) => setPhonePriceUSD(e.target.value)}
                />
                <p className="mt-4 text-xs text-neutral-400 font-light">Current rate: 1 USD = <span className="text-[#FF9900] font-bold">{KES_PER_USD} KES</span></p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            {usPhoneResult ? (
              <div className="animate-in fade-in duration-500">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-10">Estimated Quote</h3>
                <div className="space-y-6 mb-12">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800 group/row">
                    <span className="text-neutral-500 text-sm group-hover/row:text-[#FF9900] transition-colors">Buying Price</span>
                    <span className="font-medium">KES {usPhoneResult.buyingPriceKES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800 group/row">
                    <span className="text-neutral-500 text-sm group-hover/row:text-[#FF9900] transition-colors">Logistics Fee</span>
                    <span className="font-medium">KES {usPhoneResult.shippingFeeKES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800 group/row">
                    <span className="text-neutral-500 text-sm group-hover/row:text-[#FF9900] transition-colors">Service Fee</span>
                    <span className="font-medium">KES {usPhoneResult.serviceFeeKES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end pt-6">
                    <span className="text-neutral-300">Total KES</span>
                    <span className="text-4xl font-bold text-[#FF9900]">{(usPhoneResult.totalKES).toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <button 
                    onClick={() => handleShareWhatsApp('US Order', usPhoneResult)}
                    className="btn-brand w-full bg-white text-black py-5 rounded-full font-bold flex items-center justify-center gap-3"
                  >
                    <MessageCircle className="w-4 h-4" /> Order on WhatsApp
                  </button>
                  <button className="w-full bg-neutral-800 text-white py-5 rounded-full font-bold transition-all hover:bg-neutral-700 active:scale-95">Save for Later</button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center opacity-30 group-hover:opacity-100 transition-opacity">
                <Smartphone className="w-12 h-12 mb-6 text-[#FF9900]" />
                <p className="font-light">Enter an amount to see the quote breakdown.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto text-center py-20 bg-neutral-50 rounded-[3rem] group hover:border-[#FF9900]/20 border border-transparent transition-all">
          <Package className="w-12 h-12 mx-auto mb-8 text-neutral-300 group-hover:text-[#FF9900] transition-colors" />
          <h2 className="text-2xl font-medium mb-4 group-hover:text-neutral-900 transition-colors">Manual Quotation Required</h2>
          <p className="text-neutral-500 font-light mb-10 leading-relaxed px-12">General imports depend on volume (CBM/CBF) and weight. Our team will provide a custom quote within 2 hours.</p>
          <button className="btn-brand bg-neutral-900 text-white px-12 py-5 rounded-full font-medium shadow-xl">Request Manual Quote</button>
        </div>
      )}
    </div>
  );
};

export default Calculators;
