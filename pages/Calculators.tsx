
import React, { useState, useEffect } from 'react';
import { Smartphone, Package, Mail, MessageCircle, ChevronRight, ChevronLeft, Send, CheckCircle2, User, Globe, DollarSign, List, ShieldCheck } from 'lucide-react';
import { KES_PER_USD, FEE_STRUCTURE, WHATSAPP_NUMBER } from '../constants';
import { CalculationResult, SourcingRequest } from '../types';
import { submitSourcingRequest } from '../services/supabaseData';

const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'us-phone' | 'general'>('us-phone');

  // US Tech States
  const [phonePriceUSD, setPhonePriceUSD] = useState<string>('');
  const [phoneUrl, setPhoneUrl] = useState<string>('');
  const [usPhoneResult, setUsPhoneResult] = useState<CalculationResult | null>(null);

  // Sourcing Quest States
  const [questStep, setQuestStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questData, setQuestData] = useState<Partial<SourcingRequest>>({
    productName: '',
    productLink: '',
    estimatedQuantity: 1,
    shippingPreference: 'Air',
    itemType: 'General',
    clientName: '',
    clientWhatsapp: '',
    targetBudgetKES: 0,
    urgency: 'Medium'
  });

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

  const handleQuestSubmit = async () => {
    setIsSubmitting(true);
    const result = await submitSourcingRequest(questData);
    if (result.success) {
      setIsComplete(true);
      // Generate WhatsApp follow-up
      const text = encodeURIComponent(
        `Hi LegitGrinder, I have finished my Elite Sourcing Quest for ${questData.productName}.\n\n` +
        `Target Budget: KES ${questData.targetBudgetKES?.toLocaleString()}\n` +
        `Shipping: ${questData.shippingPreference}\n\n` +
        `Please confirm receipt of my request.`
      );
      setTimeout(() => {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
      }, 2000);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 py-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-neutral-900 uppercase">Intelligence <span className="text-[#FF9900] italic font-light">Hub.</span></h1>
        <p className="text-neutral-400 text-lg font-bold tracking-widest uppercase text-xs">Phased Logistics & Asset Sourcing</p>
      </div>

      <div className="flex justify-center mb-16">
        <div className="bg-neutral-100 p-2 rounded-3xl flex shadow-inner">
          <button
            onClick={() => setActiveTab('us-phone')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'us-phone' ? 'bg-white shadow-xl text-neutral-900' : 'text-neutral-400 hover:text-[#FF9900]'}`}
          >
            US Tech Sync
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'general' ? 'bg-white shadow-xl text-neutral-900' : 'text-neutral-400 hover:text-[#FF9900]'}`}
          >
            Sourcing Quest
          </button>
        </div>
      </div>

      {activeTab === 'us-phone' ? (
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-10">
            <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF9900]/10 rounded-xl flex items-center justify-center text-[#FF9900]"><Globe className="w-5 h-5" /></div>
              Direct US Node
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-2">Product Live Link</label>
                <input
                  type="url"
                  placeholder="eBay, Backmarket, Amazon, etc."
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-[1.5rem] px-6 py-5 focus:bg-white focus:border-[#FF9900] outline-none transition-all text-neutral-900 font-bold placeholder:text-neutral-300"
                  value={phoneUrl}
                  onChange={(e) => setPhoneUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-2">Listing Price ($ USD)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-neutral-300">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-[1.5rem] pl-12 pr-6 py-6 focus:bg-white focus:border-[#FF9900] outline-none transition-all text-4xl font-black text-neutral-900"
                    value={phonePriceUSD}
                    onChange={(e) => setPhonePriceUSD(e.target.value)}
                  />
                </div>
                <div className="mt-4 flex justify-between items-center px-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Market Rate: 1 USD = {KES_PER_USD} KES</p>
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group border-4 border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-[#FF9900]/10 transition-colors duration-1000"></div>
            {usPhoneResult ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Intelligence Quote</h3>
                  <div className="px-3 py-1 bg-[#FF9900]/20 text-[#FF9900] rounded-full text-[9px] font-black uppercase">Verified</div>
                </div>
                <div className="space-y-6 mb-12">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800 group/row cursor-default">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest group-hover/row:text-white transition-colors">Buying Price</span>
                    <span className="font-black text-lg">KES {usPhoneResult.buyingPriceKES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800 group/row cursor-default">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest group-hover/row:text-white transition-colors">Logistics Node</span>
                    <span className="font-black text-lg text-neutral-300">KES {usPhoneResult.shippingFeeKES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-800 group/row cursor-default">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest group-hover/row:text-white transition-colors">Service Intel</span>
                    <span className="font-black text-lg text-neutral-300">KES {usPhoneResult.serviceFeeKES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end pt-10">
                    <div>
                      <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest block mb-2">Total Acquisition Cost</span>
                      <span className="text-5xl font-black text-[#FF9900] tracking-tighter">{(usPhoneResult.totalKES).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => handleShareWhatsApp('US Order', usPhoneResult)}
                    className="w-full bg-white text-black py-6 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-[#FF9900] hover:text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                  >
                    <MessageCircle className="w-4 h-4" /> Start Acquisition
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center opacity-20 group-hover:opacity-40 transition-opacity">
                <Smartphone className="w-16 h-16 mb-8 text-[#FF9900]" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Awaiting Data Input</p>
                <p className="text-[10px] text-neutral-500 mt-2 font-bold italic">Enter price in USD to compute nodes.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          {!isComplete ? (
            <div className="bg-white border border-neutral-100 rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-neutral-100">
                <div
                  className="h-full bg-[#FF9900] transition-all duration-700 ease-out"
                  style={{ width: `${(questStep / 3) * 100}%` }}
                />
              </div>

              <div className="flex justify-between items-center mb-16 pt-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Elite Quest <span className="text-[#FF9900] italic font-light">Phase {questStep}</span></h2>
                <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Step {questStep} of 3</div>
              </div>

              {questStep === 1 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">What are we sourcing?</label>
                      <input
                        type="text"
                        placeholder="e.g. MacBook Pro M3 Max"
                        className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-[#FF9900]/5 focus:border-[#FF9900]"
                        value={questData.productName}
                        onChange={(e) => setQuestData({ ...questData, productName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Market/Example Link</label>
                      <input
                        type="url"
                        placeholder="eBay, Alibaba, website..."
                        className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-[#FF9900]/5 focus:border-[#FF9900]"
                        value={questData.productLink}
                        onChange={(e) => setQuestData({ ...questData, productLink: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setQuestStep(2)}
                      disabled={!questData.productName}
                      className="px-10 py-5 bg-neutral-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-3 group disabled:opacity-30"
                    >
                      Next Phase <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {questStep === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Shipping Node</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Air', 'Sea'].map((pref) => (
                            <button
                              key={pref}
                              onClick={() => setQuestData({ ...questData, shippingPreference: pref as any })}
                              className={`py-4 rounded-xl font-bold text-xs uppercase transition-all border-2 ${questData.shippingPreference === pref ? 'border-[#FF9900] bg-orange-50 text-[#FF9900]' : 'border-neutral-50 bg-neutral-50 text-neutral-400 hover:border-neutral-200'}`}
                            >
                              {pref} Freight
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Asset Urgency</label>
                        <select
                          className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-4 font-bold"
                          value={questData.urgency}
                          onChange={(e) => setQuestData({ ...questData, urgency: e.target.value as any })}
                        >
                          <option value="High">High (ASAP)</option>
                          <option value="Medium">Medium (Balanced)</option>
                          <option value="Low">Low (Frugal)</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-neutral-50 rounded-3xl p-8">
                      <div className="flex items-center gap-3 mb-6 text-[#FF9900]">
                        <Package className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Shipment Logic</span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed font-bold italic">"Air freight takes 7-14 days. Sea freight takes 45-60 days but saves up to 70% on heavy items."</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={() => setQuestStep(1)} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">Back</button>
                    <button
                      onClick={() => setQuestStep(3)}
                      className="px-10 py-5 bg-neutral-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-3 group"
                    >
                      Security Check <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {questStep === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Commander Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                        <input
                          type="text"
                          placeholder="Your Name"
                          className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl pl-12 pr-6 py-4 font-bold outline-none focus:ring-4 focus:ring-[#FF9900]/5 focus:border-[#FF9900]"
                          value={questData.clientName}
                          onChange={(e) => setQuestData({ ...questData, clientName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">WhatsApp Protocol</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                        <input
                          type="text"
                          placeholder="+254..."
                          className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl pl-12 pr-6 py-4 font-bold outline-none focus:ring-4 focus:ring-[#FF9900]/5 focus:border-[#FF9900]"
                          value={questData.clientWhatsapp}
                          onChange={(e) => setQuestData({ ...questData, clientWhatsapp: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 ml-2">Target Budget (KES)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-neutral-300">KES</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-neutral-100 border-none rounded-[1.5rem] pl-16 pr-6 py-6 text-3xl font-black text-neutral-900 focus:ring-4 focus:ring-[#FF9900]/5 transition-all"
                        value={questData.targetBudgetKES || ''}
                        onChange={(e) => setQuestData({ ...questData, targetBudgetKES: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={() => setQuestStep(2)} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">Review Nodes</button>
                    <button
                      onClick={handleQuestSubmit}
                      disabled={isSubmitting || !questData.clientName || !questData.clientWhatsapp}
                      className="px-12 py-6 bg-[#FF9900] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] hover:bg-black transition-all flex items-center gap-4 shadow-2xl disabled:opacity-30"
                    >
                      {isSubmitting ? 'Authenticating...' : (
                        <>Complete Quest <Send className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center py-20 bg-[#FF9900]/5 rounded-[4rem] border-2 border-dashed border-[#FF9900]/20 animate-in zoom-in-95 duration-700">
              <div className="w-24 h-24 bg-[#FF9900] rounded-[2rem] flex items-center justify-center text-white mx-auto mb-10 shadow-2xl animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter text-neutral-900 mb-4">Quest <span className="text-[#FF9900] italic font-light">Authenticated.</span></h2>
              <p className="text-neutral-500 font-bold mb-10 leading-relaxed px-12 italic">Target locked. Intelligence nodes are processing your request. Redirecting to Secure WhatsApp Protocol for final human handshake.</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setIsComplete(false) || setQuestStep(1)}
                  className="px-8 py-4 bg-neutral-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  Start New Quest
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calculators;
