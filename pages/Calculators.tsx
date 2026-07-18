import React, { useState, useEffect } from 'react';
import {
  DeviceMobile, LinkSimple, WhatsappLogo, ArrowRight, PaperPlaneTilt,
  CheckCircle, User, Package, AirplaneTilt, Timer, ShieldCheck,
  ArrowsClockwise, WarningCircle, Calculator as CalculatorIcon
} from '@phosphor-icons/react';
import { KES_PER_USD, FEE_STRUCTURE, WHATSAPP_NUMBER } from '../constants';
import { CalculationResult, SourcingRequest } from '../types';
import { submitSourcingRequest } from '../services/supabaseData';
import { Reveal } from '../components/Motion';

const QUEST_STEPS = ['The Product', 'Shipping', 'Your Details'];

// Device presets drive the shipping weight; "Other" lets the client estimate it.
type DeviceType = 'phone' | 'ipad' | 'laptop' | 'custom';
const DEVICE_OPTIONS: { id: DeviceType; label: string; kg: number | null }[] = [
  { id: 'phone', label: 'Phone', kg: 1 },
  { id: 'ipad', label: 'iPad / Tablet', kg: 2 },
  { id: 'laptop', label: 'Laptop', kg: 3.5 },
  { id: 'custom', label: 'Other', kg: null }
];

const inputBase =
  'w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#3D8593] outline-none transition-colors shadow-sm';

const labelBase = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5';

const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'us-phone' | 'general'>('us-phone');

  // US Tech States
  const [phonePriceUSD, setPhonePriceUSD] = useState<string>('');
  const [phoneUrl, setPhoneUrl] = useState<string>('');
  const [deviceType, setDeviceType] = useState<DeviceType>('phone');
  const [customWeight, setCustomWeight] = useState<string>('');
  const [usPhoneResult, setUsPhoneResult] = useState<CalculationResult | null>(null);

  const shipWeightKg = deviceType === 'custom'
    ? (parseFloat(customWeight) || 0)
    : (DEVICE_OPTIONS.find(d => d.id === deviceType)?.kg || 1);
  const deviceLabel = DEVICE_OPTIONS.find(d => d.id === deviceType)?.label || 'Item';

  // Sourcing request states
  const [questStep, setQuestStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [questError, setQuestError] = useState<string | null>(null);
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
    if (!phonePriceUSD || isNaN(Number(phonePriceUSD)) || shipWeightKg <= 0) {
      setUsPhoneResult(null);
      return;
    }

    const price = Number(phonePriceUSD);
    const buyingPriceKES = price * KES_PER_USD;
    // Shipping base scales with weight: $20/kg — phone 1 kg, iPad 2 kg, laptop 3.5 kg, or the client's own estimate.
    const shippingFeeUSD = FEE_STRUCTURE.SHIPPING_FLAT_USD * shipWeightKg + (price * FEE_STRUCTURE.SHIPPING_PERCENT);
    const shippingFeeKES = shippingFeeUSD * KES_PER_USD;

    let serviceFeeUSD = FEE_STRUCTURE.SERVICE_FEE_FIXED_USD;
    if (price > FEE_STRUCTURE.THRESHOLD_USD) {
      serviceFeeUSD = price * FEE_STRUCTURE.SERVICE_FEE_PERCENT_LARGE;
    }
    const serviceFeeKES = serviceFeeUSD * KES_PER_USD;

    let applePickupFeeKES = 0;
    if (phoneUrl.toLowerCase().includes('apple.com')) {
      applePickupFeeKES = FEE_STRUCTURE.APPLE_PICKUP_FEE_USD * KES_PER_USD;
    }

    const specialDiscountKES = 1000;

    setUsPhoneResult({
      buyingPriceKES,
      shippingFeeKES,
      serviceFeeKES,
      applePickupFeeKES: applePickupFeeKES > 0 ? applePickupFeeKES : undefined,
      specialDiscountKES,
      totalKES: buyingPriceKES + shippingFeeKES + serviceFeeKES + applePickupFeeKES - specialDiscountKES
    });
  }, [phonePriceUSD, phoneUrl, shipWeightKg]);

  const handleShareWhatsApp = (type: string, res: CalculationResult) => {
    const appleFeeText = res.applePickupFeeKES ? `\nApple Store Pick Up Fee: KES ${res.applePickupFeeKES.toLocaleString()}` : '';
    const discountText = res.specialDiscountKES ? `\nSpecial Client Discount: -KES ${res.specialDiscountKES.toLocaleString()}` : '';
    const text = encodeURIComponent(
      `Hi LegitGrinder, I'd like to place an order for ${type}.\n\n` +
      `Product Link: ${phoneUrl || 'Not provided'}\n` +
      `Item: ${deviceLabel} (est. ${shipWeightKg} kg)\n` +
      `Total: KES ${res.totalKES.toLocaleString()}${appleFeeText}${discountText}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const handleQuestSubmit = async () => {
    setIsSubmitting(true);
    setQuestError(null);

    try {
      const result = await submitSourcingRequest(questData);

      if (result.success) {
        setIsComplete(true);
        // Generate WhatsApp follow-up
        let shippingInfo = '';
        if (questData.shippingPreference === 'Air' && questData.shippingWeight) {
          shippingInfo = `Shipping: Air (${questData.shippingWeight}kg) - Estimated Cost: KES ${questData.estimatedShippingCost?.toLocaleString()}`;
        } else if (questData.shippingPreference === 'Sea' && questData.calculatedCBM) {
          shippingInfo = `Shipping: Sea (${questData.calculatedCBM.toFixed(4)} CBM) - Estimated Cost: KES ${questData.estimatedShippingCost?.toLocaleString()}`;
        }

        const text = encodeURIComponent(
          `Hi LegitGrinder, I just submitted a sourcing request for ${questData.productName}.\n\n` +
          `${shippingInfo}\n` +
          `Target Budget: KES ${questData.targetBudgetKES?.toLocaleString()}\n` +
          `Urgency: ${questData.urgency}\n\n` +
          `Please confirm receipt of my request.`
        );
        setTimeout(() => {
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
        }, 2000);
      } else {
        throw new Error(result.error?.message || 'Failed to submit sourcing request');
      }
    } catch (error: any) {
      console.error('Sourcing request error:', error);
      setQuestError(error.message || 'Failed to submit request. Please try again or contact us on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate shipping costs in real-time
  useEffect(() => {
    const KES_RATE = KES_PER_USD;
    const FIXED_FEE_KES = 135; // Fixed fee is 135 KES (not USD)

    if (questData.shippingPreference === 'Air' && questData.shippingWeight) {
      // Air freight: $13/kg converted to KES + 135 KES fixed fee
      const airCostUSD = questData.shippingWeight * 13;
      const airCostKES = airCostUSD * KES_RATE;
      const totalShipping = airCostKES + FIXED_FEE_KES;

      setQuestData(prev => ({
        ...prev,
        estimatedShippingCost: Math.round(totalShipping)
      }));
    } else if (questData.shippingPreference === 'Sea' &&
      questData.packageLength &&
      questData.packageWidth &&
      questData.packageHeight) {
      // Sea freight: Calculate CBM then multiply by 60,000 KES + fixed fee
      const cbm = (questData.packageLength * questData.packageWidth * questData.packageHeight) / 1000000;
      const seaCostKES = cbm * 60000;
      const totalShipping = seaCostKES + FIXED_FEE_KES;

      setQuestData(prev => ({
        ...prev,
        calculatedCBM: cbm,
        estimatedShippingCost: Math.round(totalShipping)
      }));
    } else {
      setQuestData(prev => ({
        ...prev,
        calculatedCBM: undefined,
        estimatedShippingCost: undefined
      }));
    }
  }, [questData.shippingPreference, questData.shippingWeight,
  questData.packageLength, questData.packageWidth, questData.packageHeight]);

  const handleStartOver = () => {
    setIsComplete(false);
    setQuestError(null);
    setQuestStep(1);
  };

  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <Reveal>
          <div className="mb-10 max-w-3xl">
            <p className="eyebrow text-[#3D8593] mb-4">Cost Intelligence</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-5 leading-[1.02]">
              Know your landed cost <span className="heading-accent italic font-light text-[#3D8593]">before you buy.</span>
            </h1>
            <p className="text-gray-500 font-light mb-6">
              Paste a US listing to get an instant all-inclusive quote — or send me a sourcing brief for anything else.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                <ArrowsClockwise size={14} weight="bold" className="text-[#3D8593]" /> Rate: 1 USD = {KES_PER_USD} KES
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                <ShieldCheck size={14} weight="bold" className="text-emerald-500" /> All-inclusive to Nairobi CBD
              </span>
            </div>
          </div>
        </Reveal>

        {/* TAB SWITCH */}
        <div className="flex gap-2 mb-12" role="tablist" aria-label="Calculator type">
          {([
            { id: 'us-phone', label: 'US Tech Quote' },
            { id: 'general', label: 'Sourcing Request' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                ? 'bg-[#0f1a1c] text-white shadow-lg'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#3D8593] hover:text-[#3D8593]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'us-phone' ? (
          /* ============================================================
             US TECH — instant landed-cost quote
             ============================================================ */
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
            <Reveal>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Paste the listing.</h2>
                <p className="text-gray-500 font-light text-sm mb-8">
                  eBay, Back Market, Amazon, Best Buy, Apple — any US store works.
                </p>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="calc-url" className={labelBase}>Product Link</label>
                    <div className="relative">
                      <LinkSimple size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                      <input
                        id="calc-url"
                        type="url"
                        placeholder="https://www.ebay.com/itm/…"
                        className={`${inputBase} pl-12`}
                        value={phoneUrl}
                        onChange={(e) => setPhoneUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <span className={labelBase}>What device is it?</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Device type">
                      {DEVICE_OPTIONS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          role="radio"
                          aria-checked={deviceType === d.id}
                          onClick={() => setDeviceType(d.id)}
                          className={`px-3 py-3 rounded-2xl text-center transition-all border ${deviceType === d.id
                            ? 'border-[#3D8593] bg-teal-50'
                            : 'border-gray-200 bg-white hover:border-[#3D8593]/40'}`}
                        >
                          <span className={`block text-[12px] font-black ${deviceType === d.id ? 'text-[#3D8593]' : 'text-gray-700'}`}>{d.label}</span>
                          <span className="block text-[10px] text-gray-400 font-medium mt-0.5">{d.kg ? `≈ ${d.kg} kg` : 'your estimate'}</span>
                        </button>
                      ))}
                    </div>
                    {deviceType === 'custom' && (
                      <div className="relative mt-3">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="Estimated weight"
                          aria-label="Estimated weight in kilograms"
                          className={`${inputBase} pr-12`}
                          value={customWeight}
                          onChange={(e) => setCustomWeight(e.target.value)}
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-black uppercase tracking-widest text-gray-300" aria-hidden="true">kg</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="calc-price" className={labelBase}>Listing Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-200" aria-hidden="true">$</span>
                      <input
                        id="calc-price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-200 rounded-3xl pl-14 pr-6 py-6 text-4xl font-black tracking-tight text-gray-900 placeholder:text-gray-200 focus:border-[#3D8593] outline-none transition-colors shadow-sm"
                        value={phonePriceUSD}
                        onChange={(e) => setPhonePriceUSD(e.target.value)}
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">
                      Apple Store links include a KES {(FEE_STRUCTURE.APPLE_PICKUP_FEE_USD * KES_PER_USD).toLocaleString()} in-store pickup fee — added automatically.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Quote card */}
            <Reveal delay={130}>
              <div className="bg-[#0f1a1c] rounded-[2rem] p-8 md:p-10 text-white shadow-2xl shadow-teal-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-56 h-56 bg-[#3D8593]/10 rounded-full -mr-24 -mt-24 blur-3xl" aria-hidden="true"></div>
                {usPhoneResult ? (
                  <div className="relative">
                    <div className="flex justify-between items-center mb-8">
                      <p className="eyebrow text-white/50">Your Landed Cost</p>
                      <span className="px-3 py-1 bg-[#3D8593]/25 text-[#7fc2ce] rounded-full text-[9px] font-black uppercase tracking-widest">Live Quote</span>
                    </div>
                    <dl className="space-y-1 mb-8">
                      {[
                        { label: 'Buying Price', value: usPhoneResult.buyingPriceKES },
                        { label: `Shipping & Handling · ${shipWeightKg} kg`, value: usPhoneResult.shippingFeeKES },
                        { label: 'Service Fee', value: usPhoneResult.serviceFeeKES },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center py-3 border-b border-white/10">
                          <dt className="text-white/50 text-[11px] font-black uppercase tracking-widest">{row.label}</dt>
                          <dd className="font-bold text-base">KES {Math.round(row.value).toLocaleString()}</dd>
                        </div>
                      ))}
                      {usPhoneResult.applePickupFeeKES && (
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <dt className="text-[#FF9900] text-[11px] font-black uppercase tracking-widest">Apple Store Pickup</dt>
                          <dd className="font-bold text-base text-[#FF9900]">KES {Math.round(usPhoneResult.applePickupFeeKES).toLocaleString()}</dd>
                        </div>
                      )}
                      {usPhoneResult.specialDiscountKES && (
                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                          <dt className="text-emerald-400 text-[11px] font-black uppercase tracking-widest">Client Discount</dt>
                          <dd className="font-bold text-base text-emerald-400">− KES {usPhoneResult.specialDiscountKES.toLocaleString()}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mb-9">
                      <p className="eyebrow text-white/50 mb-2">Total, delivered to Nairobi CBD</p>
                      <p className="text-5xl font-black tracking-tighter text-[#FF9900]">
                        KES {Math.round(usPhoneResult.totalKES).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleShareWhatsApp('US Order', usPhoneResult)}
                      className="w-full bg-white text-[#0f1a1c] py-5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-[#25D366] hover:text-white transition-all"
                    >
                      <WhatsappLogo size={18} weight="fill" /> Order via WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="relative h-80 flex flex-col items-center justify-center text-center">
                    <DeviceMobile size={52} weight="duotone" className="text-[#3D8593] mb-6" />
                    <p className="font-bold text-white/70 mb-1.5">Your quote appears here</p>
                    <p className="text-sm text-white/40 font-light max-w-[16rem]">
                      {deviceType === 'custom' && shipWeightKg <= 0
                        ? 'Enter the price and your estimated weight, and I\'ll break down every shilling.'
                        : 'Enter the USD listing price and I\'ll break down every shilling.'}
                    </p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        ) : (
          /* ============================================================
             SOURCING REQUEST — 3-step brief
             ============================================================ */
          <div className="max-w-3xl mx-auto">
            {!isComplete ? (
              <Reveal>
                <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 overflow-hidden">
                  {/* Progress */}
                  <div className="h-1.5 bg-gray-100" role="presentation">
                    <div
                      className="h-full bg-gradient-to-r from-[#3D8593] to-[#FF9900] transition-all duration-700 ease-out"
                      style={{ width: `${(questStep / 3) * 100}%` }}
                    />
                  </div>

                  <div className="p-8 md:p-12">
                    <div className="flex flex-wrap justify-between items-end gap-3 mb-10">
                      <div>
                        <p className="eyebrow text-[#3D8593] mb-2">Step {questStep} of 3</p>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                          {QUEST_STEPS[questStep - 1]}<span className="text-[#FF9900]">.</span>
                        </h2>
                      </div>
                      <div className="flex gap-1.5" aria-hidden="true">
                        {QUEST_STEPS.map((_, i) => (
                          <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 === questStep ? 'w-8 bg-[#3D8593]' : i + 1 < questStep ? 'w-3 bg-[#3D8593]/40' : 'w-3 bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>

                    {questStep === 1 && (
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="q-product" className={labelBase}>What are we sourcing?</label>
                            <input
                              id="q-product"
                              type="text"
                              placeholder="e.g. MacBook Pro M3 Max"
                              className={inputBase}
                              value={questData.productName}
                              onChange={(e) => setQuestData({ ...questData, productName: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor="q-link" className={labelBase}>Example Link <span className="text-gray-300">(optional)</span></label>
                            <input
                              id="q-link"
                              type="url"
                              placeholder="eBay, Alibaba, any website…"
                              className={inputBase}
                              value={questData.productLink}
                              onChange={(e) => setQuestData({ ...questData, productLink: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => setQuestStep(2)}
                            disabled={!questData.productName}
                            className="group px-9 py-4 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors flex items-center gap-3 disabled:opacity-30 disabled:hover:bg-[#0f1a1c]"
                          >
                            Continue <ArrowRight size={15} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    )}

                    {questStep === 2 && (
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div>
                              <span className={labelBase}>Shipping Method</span>
                              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Shipping method">
                                {(['Air', 'Sea'] as const).map((pref) => (
                                  <button
                                    key={pref}
                                    role="radio"
                                    aria-checked={questData.shippingPreference === pref}
                                    onClick={() => setQuestData({ ...questData, shippingPreference: pref })}
                                    className={`py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border ${questData.shippingPreference === pref
                                      ? 'border-[#3D8593] bg-teal-50 text-[#3D8593]'
                                      : 'border-gray-200 bg-white text-gray-400 hover:border-[#3D8593]/40'
                                      }`}
                                  >
                                    {pref} Freight
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label htmlFor="q-urgency" className={labelBase}>How urgent?</label>
                              <select
                                id="q-urgency"
                                className={inputBase}
                                value={questData.urgency}
                                onChange={(e) => setQuestData({ ...questData, urgency: e.target.value as any })}
                              >
                                <option value="High">High — I need it ASAP</option>
                                <option value="Medium">Medium — balanced</option>
                                <option value="Low">Low — cheapest route</option>
                              </select>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-brand-bg border border-gray-100 p-6 flex flex-col justify-center">
                            <div className="flex items-center gap-2.5 mb-3 text-[#3D8593]">
                              <Timer size={20} weight="duotone" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Good to know</span>
                            </div>
                            <p className="text-sm text-gray-500 font-light leading-relaxed">
                              Air freight lands in 7–14 days. Sea takes 45–60 days but saves up to 70% on heavy or bulky items.
                            </p>
                          </div>
                        </div>

                        {/* Shipping estimate */}
                        <div className="rounded-2xl bg-teal-50/60 border border-teal-100 p-6 md:p-7">
                          <div className="flex items-center gap-2.5 mb-5 text-[#3D8593]">
                            <CalculatorIcon size={20} weight="duotone" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Estimate your shipping</span>
                          </div>

                          {questData.shippingPreference === 'Air' ? (
                            <div className="space-y-4">
                              <div>
                                <label htmlFor="q-weight" className={labelBase}>Estimated Weight (kg)</label>
                                <input
                                  id="q-weight"
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  min="0"
                                  placeholder="e.g. 5.5"
                                  className={inputBase}
                                  value={questData.shippingWeight || ''}
                                  onChange={(e) => setQuestData({ ...questData, shippingWeight: parseFloat(e.target.value) || undefined })}
                                />
                              </div>
                              {questData.shippingWeight && questData.estimatedShippingCost && (
                                <div className="bg-white rounded-2xl p-5 border border-teal-100 space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Air freight — {questData.shippingWeight} kg × $13</span>
                                    <span className="font-bold text-gray-900">KES {Math.round(questData.shippingWeight * 13 * KES_PER_USD).toLocaleString()}</span>
                                  </div>
                                  <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593]">Estimated Shipping</span>
                                    <span className="text-lg font-black tracking-tight text-[#3D8593]">KES {questData.estimatedShippingCost.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                {([
                                  { key: 'packageLength', label: 'Length (cm)', ph: 'L' },
                                  { key: 'packageWidth', label: 'Width (cm)', ph: 'W' },
                                  { key: 'packageHeight', label: 'Height (cm)', ph: 'H' },
                                ] as const).map((dim) => (
                                  <div key={dim.key}>
                                    <label htmlFor={`q-${dim.key}`} className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">{dim.label}</label>
                                    <input
                                      id={`q-${dim.key}`}
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      placeholder={dim.ph}
                                      className={inputBase}
                                      value={questData[dim.key] || ''}
                                      onChange={(e) => setQuestData({ ...questData, [dim.key]: parseFloat(e.target.value) || undefined })}
                                    />
                                  </div>
                                ))}
                              </div>
                              {questData.calculatedCBM && questData.estimatedShippingCost && (
                                <div className="bg-white rounded-2xl p-5 border border-teal-100 space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Volume</span>
                                    <span className="font-bold text-gray-900">{questData.calculatedCBM.toFixed(4)} m³</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Sea freight — {questData.calculatedCBM.toFixed(4)} × 60,000</span>
                                    <span className="font-bold text-gray-900">KES {Math.round(questData.calculatedCBM * 60000).toLocaleString()}</span>
                                  </div>
                                  <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593]">Estimated Shipping</span>
                                    <span className="text-lg font-black tracking-tight text-[#3D8593]">KES {questData.estimatedShippingCost.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <button onClick={() => setQuestStep(1)} className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                            ← Back
                          </button>
                          <button
                            onClick={() => setQuestStep(3)}
                            className="group px-9 py-4 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors flex items-center gap-3"
                          >
                            Continue <ArrowRight size={15} weight="bold" className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    )}

                    {questStep === 3 && (
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="q-name" className={labelBase}>Your Name</label>
                            <div className="relative">
                              <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                              <input
                                id="q-name"
                                type="text"
                                placeholder="Jane Wanjiku"
                                className={`${inputBase} pl-11`}
                                value={questData.clientName}
                                onChange={(e) => setQuestData({ ...questData, clientName: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="q-whatsapp" className={labelBase}>WhatsApp Number</label>
                            <div className="relative">
                              <WhatsappLogo size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                              <input
                                id="q-whatsapp"
                                type="tel"
                                placeholder="+254…"
                                className={`${inputBase} pl-11`}
                                value={questData.clientWhatsapp}
                                onChange={(e) => setQuestData({ ...questData, clientWhatsapp: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="q-budget" className={labelBase}>Target Budget (KES)</label>
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-gray-200" aria-hidden="true">KES</span>
                            <input
                              id="q-budget"
                              type="number"
                              inputMode="numeric"
                              min="0"
                              placeholder="0"
                              className="w-full bg-white border border-gray-200 rounded-3xl pl-20 pr-6 py-5 text-3xl font-black tracking-tight text-gray-900 placeholder:text-gray-200 focus:border-[#3D8593] outline-none transition-colors shadow-sm"
                              value={questData.targetBudgetKES || ''}
                              onChange={(e) => setQuestData({ ...questData, targetBudgetKES: parseFloat(e.target.value) })}
                            />
                          </div>
                        </div>

                        {questError && (
                          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3" role="alert">
                            <WarningCircle size={20} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-rose-900 mb-0.5">Submission failed</p>
                              <p className="text-xs text-rose-600">{questError}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <button onClick={() => setQuestStep(2)} className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                            ← Back
                          </button>
                          <button
                            onClick={handleQuestSubmit}
                            disabled={isSubmitting || !questData.clientName || !questData.clientWhatsapp}
                            className="btn-vibrant-orange shine px-10 py-4 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center gap-3 disabled:opacity-30"
                          >
                            {isSubmitting ? 'Sending…' : (
                              <>Send Request <PaperPlaneTilt size={16} weight="fill" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 text-center px-8 py-16 md:py-20">
                  <CheckCircle size={64} weight="duotone" className="text-[#3D8593] mx-auto mb-7" />
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                    Request <span className="heading-accent italic font-light text-[#3D8593]">received.</span>
                  </h2>
                  <p className="text-gray-500 font-light leading-relaxed max-w-md mx-auto mb-10">
                    I've got your brief for <span className="font-bold text-gray-900">{questData.productName}</span>.
                    WhatsApp is opening so we can confirm the details and get you a firm quote.
                  </p>
                  <button
                    onClick={handleStartOver}
                    className="px-9 py-4 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors"
                  >
                    Start Another Request
                  </button>
                </div>
              </Reveal>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculators;
