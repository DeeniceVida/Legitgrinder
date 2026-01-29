
import React, { useState } from 'react';
import { ShoppingCart, ChevronRight, ChevronLeft, Minus, Plus, Star, ChevronDown, ChevronUp, Package, Clock, Percent, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Availability, Product, ProductVariation, OrderStatus } from '../types';
import { WHATSAPP_NUMBER } from '../constants';
import { getStockStatus, createInvoice, verifyPaystackPayment } from '../services/supabaseData';
import { PaystackButton } from 'react-paystack';
import { supabase } from '../lib/supabase';

interface ShopProps {
  products: Product[];
  onUpdateProducts?: (products: Product[]) => void;
}

const Shop: React.FC<ShopProps> = ({ products, onUpdateProducts }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('description');
  const [showPaystack, setShowPaystack] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Robust key loading for Paystack
  const PAYSTACK_PUBLIC_KEY = (
    (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY ||
    (typeof (window as any).__PAYSTACK_KEY__ !== 'undefined' ? (window as any).__PAYSTACK_KEY__ : '')
  ).trim();

  const isTestMode = PAYSTACK_PUBLIC_KEY.startsWith('pk_test');

  // STICKY DIAGNOSTIC: Do not remove until Paystack is confirmed working
  console.log(`💎 Paystack Info -> Mode: ${isTestMode ? 'TEST' : 'LIVE'}, Key prefix: ${PAYSTACK_PUBLIC_KEY.substring(0, 8)}...`);

  const handleWhatsAppInquiry = (p: Product) => {
    const totalPrice = (p.discountPriceKES || p.priceKES) + (selectedVariation?.priceKES || 0);
    const varText = selectedVariation ? ` (Selected: ${selectedVariation.type} - ${selectedVariation.name})` : '';
    const text = encodeURIComponent(`Hi LegitGrinder, I'm interested in buying ${p.name}${varText}.\nQuantity: ${quantity}\nTotal Price: KES ${totalPrice.toLocaleString()}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const handlePaystackSuccess = async (response: any, product: Product) => {
    setPaymentLoading(true);

    try {
      // 1. Verify on backend (Phase 5 Secure Flow)
      const verification = await verifyPaystackPayment(response.reference);

      if (!verification.success) {
        const isOffline = verification.error?.message === 'VERIFICATION_OFFLINE';

        if (isOffline && isTestMode) {
          console.warn("💎 Paystack Verification Service Offline. Bypassing for TEST Reference:", response.reference);
          alert("🔧 Verification service is currently offline.\n\nSince this is a TEST payment, we are automatically proceeding to record your invoice and order history.");
          // Fall through to Create Invoice
        } else {
          const errorMsg = verification.error?.message || verification.data?.message || "Unknown verification failure.";
          alert(`Payment verification failed: ${errorMsg}\n\nPlease share your reference (${response.reference}) on WhatsApp for manual sync.`);
          setPaymentLoading(false);
          return;
        }
      }

      // 2. Create Invoice
      const { data: { user } } = await supabase.auth.getUser();
      const totalPrice = (product.discountPriceKES || product.priceKES) + (selectedVariation?.priceKES || 0);

      await createInvoice({
        userId: user?.id,
        clientName: user?.user_metadata?.full_name || 'Guest Elite',
        productName: product.name,
        totalKES: totalPrice * quantity,
        isPaid: true,
        status: OrderStatus.RECEIVED_BY_AGENT,
        paystackReference: response.reference
      });

      // 3. Close the loop with Admin via WhatsApp
      const whatsappMsg = encodeURIComponent(
        `✅ SUCCESSFUL PAYMENT\n\n` +
        `Ref: ${response.reference}\n` +
        `Item: ${product.name}\n` +
        `Total: KES ${(totalPrice * quantity).toLocaleString()}\n\n` +
        `Please confirm receipt and start agent processing.`
      );

      alert("Secure Payment Verified! Your elite asset is being prepared.");
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`, '_blank');
      setSelectedProduct(null);
    } catch (error) {
      console.error("Payment sync error:", error);
      alert("Payment successful but sync failed. Please share your reference on WhatsApp.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (selectedProduct) {
    const p = selectedProduct;
    const isLocal = p.availability === Availability.LOCAL;
    const basePrice = p.discountPriceKES || p.priceKES;
    const currentPrice = basePrice + (selectedVariation?.priceKES || 0);

    const displayImage = (selectedVariation && selectedVariation.imageUrl)
      ? selectedVariation.imageUrl
      : p.imageUrls[selectedImageIdx];

    return (
      <div className="bg-[#FBFBFA] min-h-screen pt-32 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* TOP NAVIGATION / BREADCRUMBS */}
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-12">
            <button
              onClick={() => { setSelectedProduct(null); setSelectedVariation(null); }}
              className="hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              Home
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900">Products</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            {/* LEFT: VISUAL ECOSYSTEM */}
            <div className="space-y-8 relative lg:sticky lg:top-32">
              <div className="aspect-[4/5] bg-white rounded-[3rem] overflow-hidden border border-neutral-100 relative group">
                <img
                  src={displayImage}
                  className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
                  alt={p.name}
                />
                <div className={`absolute top-8 left-8 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md ${p.stockCount === 0 ? 'bg-red-500/90 text-white' :
                  p.stockCount <= 5 ? 'bg-[#FF9900]/90 text-white' :
                    'bg-green-500/90 text-white'
                  }`}>
                  {getStockStatus(p.stockCount)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {p.imageUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`aspect-square rounded-[1.5rem] overflow-hidden border-2 transition-all duration-500 ${selectedImageIdx === idx ? 'border-[#3D8593] scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img src={url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: INTELLIGENCE NODE */}
            <div className="flex flex-col">
              <div className="mb-10">
                <h1 className="text-6xl font-bold text-gray-900 mb-4 tracking-tighter leading-tight">{p.name}</h1>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-[#3D8593]">KES {currentPrice.toLocaleString()}</span>
                  {selectedVariation && selectedVariation.priceKES > 0 && (
                    <div className="h-6 w-[1px] bg-neutral-200"></div>
                  )}
                  {selectedVariation && selectedVariation.priceKES > 0 && (
                    <span className="text-xs font-black text-[#FF9900] uppercase tracking-widest">
                      +{selectedVariation.name} Selection
                    </span>
                  )}
                </div>
              </div>

              {/* DESCRIPTION ACCORDION (ELITE CHAIR STYLE) */}
              <div className="mb-10 bg-white border border-neutral-100 rounded-[2rem] overflow-hidden shadow-sm">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === 'description' ? null : 'description')}
                  className="w-full px-8 py-6 flex justify-between items-center hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Description</span>
                  {activeAccordion === 'description' ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${activeAccordion === 'description' ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-8 pb-8 text-sm text-gray-500 font-medium leading-relaxed">
                    {p.description}
                  </div>
                </div>
              </div>

              {/* VARIATIONS / CONFIGURATIONS */}
              {Array.isArray(p.variations) && p.variations.length > 0 && (
                <div className="mb-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6">Select Configuration</p>
                  <div className="flex flex-wrap gap-3">
                    {p.variations.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariation(selectedVariation === v ? null : v)}
                        className={`group relative px-6 py-5 rounded-[1.5rem] transition-all duration-300 border-2 ${selectedVariation === v
                          ? 'border-[#3D8593] bg-[#3D8593]/5'
                          : 'border-white bg-white shadow-sm hover:shadow-md'
                          }`}
                      >
                        <span className="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1 opacity-50">{v.type}</span>
                        <span className={`text-xs font-bold ${selectedVariation === v ? 'text-[#3D8593]' : 'text-gray-900'}`}>{v.name}</span>
                        {v.priceKES > 0 && (
                          <span className="block text-[8px] font-black text-[#FF9900] mt-1">+ KES {v.priceKES.toLocaleString()}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION CENTER */}
              <div className="space-y-6 mb-12">
                {selectedProduct.stockCount > 0 ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      {/* QUANTITY CONTROL */}
                      <div className="flex items-center bg-white border-2 border-neutral-100 rounded-[1.5rem] p-2 h-[64px]">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 rounded-xl transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-6 font-black text-lg min-w-[4rem] text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 rounded-xl transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {!showPaystack ? (
                        <button
                          onClick={() => {
                            if (!PAYSTACK_PUBLIC_KEY) {
                              alert("Payment system configuration missing. Please ensure VITE_PAYSTACK_PUBLIC_KEY is set in your environment.");
                              return;
                            }
                            setShowPaystack(true);
                          }}
                          className="flex-1 h-[64px] bg-black text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-[#3D8593] transition-all shadow-2xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                        >
                          Buy Now
                        </button>
                      ) : (
                        <div className="flex-1 flex flex-col gap-3">
                          <PaystackButton
                            className="w-full h-[64px] bg-[#3D8593] text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-teal-900/10"
                            publicKey={PAYSTACK_PUBLIC_KEY}
                            amount={currentPrice * 100 * quantity}
                            currency="KES"
                            email="client@legitgrinder.com"
                            metadata={{
                              custom_fields: [
                                { display_name: "Product", variable_name: "product", value: p.name },
                                { display_name: "Quantity", variable_name: "quantity", value: quantity }
                              ]
                            }}
                            text="Confirm Secure Payment"
                            onSuccess={(ref: any) => handlePaystackSuccess(ref, p)}
                            onClose={() => setShowPaystack(false)}
                          />
                        </div>
                      )}
                    </div>

                    {showPaystack && (
                      <button
                        onClick={() => handleWhatsAppInquiry(p)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3D8593] hover:underline text-center"
                      >
                        Wait, use WhatsApp Inquiry instead?
                      </button>
                    )}

                    {/* M-PESA FALLBACK BANNER */}
                    <div className="bg-neutral-900 p-8 rounded-[2rem] border-2 border-[#FF9900]/20 relative overflow-hidden group">
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-12 h-12 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center shrink-0">
                          <AlertCircle className="w-6 h-6 text-[#FF9900]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-2">M-Pesa Backup Option</p>
                          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                            Pay via Buy Goods Till: <span className="text-white font-black tracking-[0.2em]">853 7538</span>. Then share code on WhatsApp.
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#FF9900]/10 transition-all duration-1000"></div>
                    </div>
                  </div>
                ) : (
                  <button disabled className="w-full py-8 bg-neutral-100 text-neutral-400 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] cursor-not-allowed italic">
                    Asset Currently Unavailable
                  </button>
                )}
              </div>

              {/* LOGISTICS INTELLIGENCE CARDS */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-neutral-100 p-8 rounded-[2rem] shadow-sm group hover:border-[#3D8593]/30 transition-all">
                  <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center mb-6"><Package className="w-5 h-5 text-gray-400" /></div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Logistics</p>
                  <p className="text-sm font-black text-gray-900">{isLocal ? 'In-State Pickup' : 'Air Freight'}</p>
                </div>
                <div className="bg-white border border-neutral-100 p-8 rounded-[2rem] shadow-sm group hover:border-[#3D8593]/30 transition-all">
                  <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center mb-6"><Clock className="w-5 h-5 text-gray-400" /></div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Arrival</p>
                  <p className="text-sm font-black text-gray-900">{isLocal ? 'Immediate' : (p.shippingDuration || '3-4 Weeks')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RATING & REVIEWS SECTION */}
          <div className="mt-32 pt-32 border-t border-neutral-100">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 mb-16 text-center">Elite Feedback</h2>

            <div className="grid lg:grid-cols-3 gap-20">
              {/* RATING SUMMARY */}
              <div className="lg:col-span-1">
                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-9xl font-black text-gray-900 tracking-tighter">4.8</span>
                  <div className="text-gray-400">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-black text-black" />)}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Total 42 Reviews</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-400 w-4">{rating}</span>
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full"
                          style={{ width: `${rating === 5 ? '85' : rating === 4 ? '10' : '5'}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TESTIMONIAL FEED */}
              <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
                {[
                  { name: "Obayedul", date: "13 Oct 2024", comment: "The build quality is exceptional. Exactly what you'd expect from the elite inventory." },
                  { name: "Sarah K.", date: "28 Dec 2024", comment: "Arrival was faster than the ETA. Perfectly synced with my workstation setup." }
                ].map((review, i) => (
                  <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="font-black text-gray-900 mb-1">{review.name}</p>
                        <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{review.date}</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-black text-black" />)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed italic">"{review.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen pt-48 pb-32 px-6">
      <div className="max-w-7xl mx-auto text-center mb-24">
        <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tighter text-gray-900">Elite <span className="text-[#3D8593] italic font-light heading-accent">Inventory.</span></h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {products.map((p) => (
          <div key={p.id} className="group flex flex-col cursor-pointer text-left animate-in fade-in slide-in-from-bottom-8">
            <div className="aspect-[4/5] bg-neutral-100 relative overflow-hidden rounded-[3rem] mb-8 shadow-sm group-hover:shadow-2xl transition-all border border-white">
              <img src={p.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
              <div className={`absolute top-6 right-6 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg ${p.stockCount === 0 ? 'bg-red-500 text-white' :
                p.stockCount <= 5 ? 'bg-yellow-500 text-white' :
                  'bg-green-500 text-white'
                }`}>{getStockStatus(p.stockCount)}</div>
            </div>
            <div className="px-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{p.name}</h3>
                <span className="text-2xl font-black text-[#FF9900]">KES {(p.discountPriceKES || p.priceKES).toLocaleString()}</span>
              </div>
              <button onClick={() => setSelectedProduct(p)} className="bg-[#3D8593] text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">View <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
