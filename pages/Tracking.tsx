import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlass, Package, Lock, ArrowRight, CircleNotch, CheckCircle,
  Truck, Clock, SealCheck, WhatsappLogo
} from '@phosphor-icons/react';
import { STATUS_SEQUENCE, WHATSAPP_NUMBER } from '../constants';
import { OrderStatus, Invoice, getOrderProgress } from '../types';
import { fetchInvoiceByNumber } from '../services/supabaseData';
import { Reveal } from '../components/Motion';

interface TrackingProps {
  isLoggedIn: boolean;
  invoices: Invoice[];
}

const Tracking: React.FC<TrackingProps> = ({ isLoggedIn, invoices }) => {
  const [invoiceInput, setInvoiceInput] = useState('');
  const [searchedInvoice, setSearchedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);
  const [searchParams] = useSearchParams();

  const handleSearch = async (id?: string) => {
    const searchId = (id || invoiceInput).trim();
    if (!searchId) return;

    setLoading(true);
    setShowNotFound(false);
    setSearchedInvoice(null);

    // 1. Try local cache first (matches number or Paystack tracking code)
    const found = invoices.find(inv => inv.invoiceNumber === searchId || inv.paystackReference === searchId);

    if (found) {
      setSearchedInvoice(found);
      setLoading(false);
    } else {
      // 2. Fetch directly from DB (guests & deep links; matches number OR reference)
      const fresh = await fetchInvoiceByNumber(searchId);
      setSearchedInvoice(fresh);
      if (!fresh) setShowNotFound(true);
      setLoading(false);
    }
  };

  // Deep links: /tracking?id=<invoice number or tracking code> auto-tracks
  useEffect(() => {
    const id = searchParams.get('id') || searchParams.get('ref');
    if (id) {
      setInvoiceInput(id);
      handleSearch(id);
    }
  }, [searchParams, invoices.length]);

  const statusIdx = searchedInvoice ? STATUS_SEQUENCE.indexOf(searchedInvoice.status) : -1;
  const progress = searchedInvoice ? getOrderProgress(searchedInvoice.status) : 0;
  const delivered = searchedInvoice?.status === OrderStatus.DELIVERED;

  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <Reveal>
          <div className="text-center mb-10">
            <p className="eyebrow text-[#3D8593] mb-4">Live Order Tracking</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 leading-[1.02]">
              Where's my <span className="heading-accent italic font-light text-[#3D8593]">order?</span>
            </h1>
            <p className="text-gray-500 font-light">Enter your invoice number or tracking code — it's on your receipt.</p>
          </div>
        </Reveal>

        {/* SEARCH */}
        <div className="max-w-md mx-auto mb-12">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="relative"
          >
            <input
              type="text"
              placeholder="e.g. 4932 or T839201..."
              className="w-full h-16 bg-white border border-gray-200 rounded-full pl-7 pr-20 text-lg font-bold tracking-wider focus:border-[#3D8593] outline-none transition-colors shadow-sm"
              value={invoiceInput}
              onChange={(e) => setInvoiceInput(e.target.value)}
              aria-label="Invoice number or tracking code"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Track order"
              className="absolute right-2 top-2 bottom-2 w-12 bg-[#0f1a1c] text-white rounded-full hover:bg-[#3D8593] transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <CircleNotch size={20} className="animate-spin" /> : <MagnifyingGlass size={20} weight="bold" />}
            </button>
          </form>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center py-16 animate-in fade-in duration-500">
            <CircleNotch size={36} className="text-[#3D8593] animate-spin mb-5" />
            <p className="eyebrow text-gray-400">Locating your shipment…</p>
          </div>
        )}

        {/* NOT FOUND */}
        {showNotFound && !loading && (
          <Reveal>
            <div className="text-center py-14 px-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
              <Package size={44} weight="duotone" className="text-gray-300 mx-auto mb-5" />
              <h3 className="text-xl font-bold mb-2">Order not found</h3>
              <p className="text-gray-500 font-light max-w-sm mx-auto mb-8">
                Nothing matches <strong className="text-gray-900">"{invoiceInput}"</strong>. Double-check your invoice number, or ask us directly.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi LegitGrinder! I'm trying to track my order: ${invoiceInput}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest"
              >
                <WhatsappLogo size={16} weight="fill" /> Ask on WhatsApp
              </a>
            </div>
          </Reveal>
        )}

        {/* RESULT */}
        {searchedInvoice && !loading && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            {/* Order summary card */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-ink-hero text-white px-7 py-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow text-[#FF9900] mb-1.5">Order Found</p>
                  <h2 className="text-2xl font-bold tracking-tight">#{searchedInvoice.invoiceNumber}</h2>
                </div>
                <div className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest ${delivered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white'}`}>
                  {delivered ? '✓ Delivered' : searchedInvoice.status}
                </div>
              </div>

              <div className="px-7 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-gray-400 font-bold shrink-0">Item</span><span className="font-bold text-gray-900 text-right truncate" title={searchedInvoice.productName}>{searchedInvoice.productName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Last Update</span><span className="font-bold text-gray-900">{searchedInvoice.lastUpdate}</span></div>
              </div>

              {/* Progress bar */}
              <div className="px-7 pb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Journey Progress</span>
                  <span className="text-sm font-black text-[#3D8593]">{progress}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3D8593] to-[#FF9900] rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Timeline (logged in) or lock (guest) */}
            {isLoggedIn ? (
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm px-7 py-6">
                <p className="eyebrow text-gray-400 mb-5">Shipment Journey</p>
                <ol className="relative">
                  {STATUS_SEQUENCE.map((status, i) => {
                    const isDone = i < statusIdx;
                    const isCurrent = i === statusIdx;
                    const isLast = i === STATUS_SEQUENCE.length - 1;
                    return (
                      <li key={status} className="relative flex gap-4 pb-5 last:pb-0">
                        {/* Connector line */}
                        {!isLast && (
                          <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${isDone ? 'bg-[#3D8593]' : 'bg-gray-100'}`} aria-hidden="true"></span>
                        )}
                        {/* Node */}
                        <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isDone ? 'bg-[#3D8593] text-white'
                          : isCurrent ? 'bg-[#FF9900] text-white shadow-lg shadow-orange-200'
                          : 'bg-gray-100 text-gray-300'
                        }`}>
                          {isDone ? <CheckCircle size={16} weight="fill" />
                            : isCurrent ? <Truck size={15} weight="fill" className="animate-pulse" />
                            : <Clock size={14} />}
                        </span>
                        <div className="pt-1">
                          <p className={`text-sm font-bold leading-none ${isCurrent ? 'text-[#FF9900]' : isDone ? 'text-gray-900' : 'text-gray-300'}`}>
                            {status}
                          </p>
                          {isCurrent && !delivered && (
                            <p className="text-[11px] text-gray-400 font-medium mt-1.5">Your order is here right now</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <Reveal>
                <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 px-8 py-10 text-center">
                  <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Lock size={24} weight="duotone" className="text-[#3D8593]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Unlock the full journey</h3>
                  <p className="text-gray-500 font-light max-w-sm mx-auto mb-7">
                    You can see your current status above. Create a free account to unlock the step-by-step journey timeline and your order history.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 bg-[#0f1a1c] text-white px-9 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#3D8593] transition-colors"
                  >
                    Create Free Account <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              </Reveal>
            )}

            {/* Help strip */}
            <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 px-6 py-4">
              <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                <SealCheck size={16} weight="duotone" className="text-[#3D8593]" /> Question about this order?
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi LegitGrinder! Quick question about my order #${searchedInvoice.invoiceNumber} (${searchedInvoice.productName})`)}`}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 text-[#25D366] font-black uppercase text-[10px] tracking-widest hover:underline"
              >
                <WhatsappLogo size={16} weight="fill" /> WhatsApp Us
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
