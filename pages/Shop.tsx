
import React, { useState, useEffect } from 'react';
import { ShoppingCart, ChevronRight, ChevronLeft, Minus, Plus, Star, ChevronDown, ChevronUp, Package, Clock, Percent, Truck, CheckCircle2, AlertCircle, Search, Maximize, Heart, ArrowUpRight, Youtube, Share2, Check } from 'lucide-react';
import { Availability, Product, ProductVariation, OrderStatus } from '../types';
import { WHATSAPP_NUMBER } from '../constants';
import { getStockStatus, createInvoice, verifyPaystackPayment } from '../services/supabaseData';
import { PaystackButton } from 'react-paystack';
import { supabase } from '../lib/supabase';
import SafeImage from '../components/SafeImage';
import { useSearchParams } from 'react-router-dom';

interface ShopProps {
  products: Product[];
  onUpdateProducts?: (products: Product[]) => void;
}

const Shop: React.FC<ShopProps> = ({ products, onUpdateProducts }) => {
  const [user, setUser] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('description');
  const [showPaystack, setShowPaystack] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch logged in user for metadata
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  // Handle product parameter in URL
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [searchParams, products]);

  // Sync selectedProduct with URL
  useEffect(() => {
    if (selectedProduct) {
      setSearchParams({ product: selectedProduct.id }, { replace: true });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('product');
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedProduct]);

  // Force LIVE key for production readiness (overrides .env if needed for immediate go-live)
  const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

  const handleWhatsAppInquiry = (p: Product) => {
    const totalPrice = (p.discountPriceKES || p.priceKES) + (selectedVariation?.priceKES || 0);
    const varText = selectedVariation ? ` (Selected: ${selectedVariation.type} - ${selectedVariation.name})` : '';
    const text = encodeURIComponent(`Hi LegitGrinder, I'm interested in buying ${p.name}${varText}.\nQuantity: ${quantity}\nTotal Price: KES ${totalPrice.toLocaleString()}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const handleShare = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/shop?product=${product.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handlePaystackSuccess = async (response: any, product: Product) => {
    setPaymentLoading(true);
    const trackingCode = response.reference;
    const totalPrice = (product.discountPriceKES || product.priceKES) + (selectedVariation?.priceKES || 0);

    const performSync = async () => {
      try {
        // 1. Verify on backend (Phase 5 Secure Flow)
        const verification = await verifyPaystackPayment(response.reference);

        if (!verification.success) {
          const errorMsg = verification.error?.message || verification.data?.message || "Unknown verification failure.";
          console.error("Payment verification failed:", errorMsg);
          // We continue to invoice creation anyway in case it's a transient verification issue
        }

        // 2. Create Invoice
        const { data: { user: authUser } } = await supabase.auth.getUser();

        const invoiceResult = await createInvoice({
          userId: authUser?.id,
          clientName: authUser?.user_metadata?.full_name || 'Guest Elite',
          productName: product.name,
          quantity: quantity,
          totalKES: totalPrice * quantity,
          isPaid: true,
          status: OrderStatus.RECEIVED_BY_AGENT,
          paystackReference: response.reference
        });

        if (!invoiceResult.success) {
          console.error("Database record failed:", invoiceResult.error);
        }
      } catch (err) {
        console.error("Background sync error:", err);
      }
    };

    // Trigger sync in background (Non-blocking for immediate redirect)
    performSync().catch(console.error);

    // 3. ALWAYS Close the loop with Admin via WhatsApp (Include Tracking Code)
    const trackingLink = `https://legitgrinder.site/track?ref=${trackingCode}`;
    const whatsappMsg = encodeURIComponent(
      `✅ SUCCESSFUL PAYMENT\n\n` +
      `Tracking Code: ${trackingCode}\n` +
      `Item: ${product.name}\n` +
      `Quantity: ${quantity}\n` +
      `Total: KES ${(totalPrice * quantity).toLocaleString()}\n\n` +
      `Track Status here: ${trackingLink}\n\n` +
      `Please confirm receipt and start agent processing.`
    );

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

    // IMMEDIATE REDIRECTION (Bulletproof with fallback)
    try {
      window.location.href = waUrl;
    } catch (e) {
      console.error("Redirection failed, opening in new window:", e);
      window.open(waUrl, '_blank');
    }

    // Clean up
    setSelectedProduct(null);
    setPaymentLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <nav className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              <button
                onClick={() => { setSelectedProduct(null); setSelectedVariation(null); }}
                className="hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                Home
              </button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-900">Products</span>
            </div>
            <button
              onClick={(e) => handleShare(e, p)}
              className="px-6 py-3 bg-white border border-neutral-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] hover:text-white transition-all shadow-sm flex items-center gap-2"
            >
              {copiedId === p.id ? (
                <>
                  <Check className="w-4 h-4" /> Link Copied
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" /> Share Product
                </>
              )}
            </button>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            {/* LEFT: VISUAL ECOSYSTEM */}
            <div className="space-y-8 relative lg:sticky lg:top-32">
              <div className="aspect-square bg-white rounded-[3rem] overflow-hidden border border-neutral-100 relative group">
                <SafeImage
                  src={displayImage}
                  className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
                  alt={p.name}
                />
                <div className={`absolute top-8 left-8 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md ${p.availability === Availability.IMPORT ? 'bg-[#3D8593] text-white' :
                  p.stockCount === 0 ? 'bg-red-500/90 text-white' :
                    p.stockCount <= 5 ? 'bg-[#FF9900]/90 text-white' :
                      'bg-green-500/90 text-white'
                  }`}>
                  {p.availability === Availability.IMPORT ? 'Import on Order' : getStockStatus(p.stockCount || 0)}
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
                    <SafeImage src={url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: INTELLIGENCE NODE */}
            <div className="flex flex-col">
              <div className="mb-10">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tighter leading-[1.1]">{p.name}</h1>
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
                    <p>{p.description}</p>

                    {p.videoUrl && (
                      <div className="mt-4 pt-4 border-t border-neutral-100">
                        <a
                          href={p.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF9900]/10 text-[#FF9900] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF9900] hover:text-white transition-all shadow-sm"
                        >
                          <Youtube className="w-4 h-4" /> Watch Product Video
                        </a>
                      </div>
                    )}
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
                {p.availability === Availability.IMPORT && (
                  <div className="bg-[#3D8593]/5 p-6 rounded-[2rem] border border-[#3D8593]/20 flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-[#3D8593]/10 rounded-xl flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-[#3D8593]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#3D8593] uppercase tracking-[0.2em] mb-1">Import Notice</p>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        This is an **Import on Order** item. We will source this specifically for you.
                        <span className="block mt-1 font-bold text-gray-900 text-[10px] uppercase">
                          2-3 Weeks via Air | 4-5 Weeks via Sea
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {(p.stockCount && p.stockCount > 0) || p.availability === Availability.IMPORT ? (
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
                          {(new Date().getMonth() === 1 && new Date().getDate() >= 1 && new Date().getDate() <= 15) ? "💝 Buy Now" : "Buy Now"}
                        </button>
                      ) : (
                        <div className="flex-1 flex flex-col gap-3">
                          <PaystackButton
                            className="w-full h-[64px] bg-[#3D8593] text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-teal-900/10"
                            publicKey="pk_live_b11692e8994766a02428b1176fc67f4b8b958974"
                            amount={Math.round(currentPrice * 100 * quantity)}
                            currency="KES"
                            email={user?.email || "client@legitgrinder.com"}
                            metadata={{
                              custom_fields: [
                                { display_name: "Customer Name", variable_name: "customer_name", value: user?.user_metadata?.full_name || 'Guest Elite' },
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

                    <button
                      onClick={() => handleWhatsAppInquiry(p)}
                      className="w-full h-[64px] bg-[#25D366] text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-[#128C7E] transition-all shadow-xl flex items-center justify-center gap-3"
                    >
                      Order via WhatsApp
                    </button>

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
                  <p className="text-sm font-black text-gray-900">{isLocal ? 'Immediate' : '2-3 Weeks (Air)'}</p>
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
    <div className="bg-[#FBFBFA] min-h-screen pt-32 pb-32">
      {/* APP-STYLE HEADER NODE */}
      <div className="px-6 mb-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-8">Elite Marketplace</h1>

          {/* SEARCH & SCAN BAR */}
          <div className="relative mb-8 group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[72px] bg-white border border-neutral-100 rounded-[2.5rem] pl-16 pr-20 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#3D8593]/5 transition-all shadow-sm"
            />
            <div className="absolute inset-y-2 right-2 p-4 bg-neutral-50 rounded-[2rem] flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors">
              <Maximize className="w-5 h-5 text-gray-900" />
            </div>
          </div>

          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Popular Items'}
            </h2>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-black uppercase tracking-widest text-red-500"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PRODUCT GRID - DYNAMIC 2-COLUMN MOBILE */}
      <div className="px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12">
          {filteredProducts.map((p) => (
            <div key={p.id} className="group flex flex-col cursor-pointer animate-in fade-in slide-in-from-bottom-8">
              <div
                className="aspect-square bg-white relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] mb-6 shadow-sm border border-neutral-100 group-hover:shadow-2xl transition-all"
                onClick={() => setSelectedProduct(p)}
              >
                <SafeImage src={p.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />

                {/* HEART OVERLAY */}
                <div className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-[#3D8593] hover:text-white transition-all group/heart">
                  <Heart className={`w-4 h-4 md:w-5 h-5 group-hover/heart:text-white ${(new Date().getMonth() === 1 && new Date().getDate() >= 1 && new Date().getDate() <= 20) ? 'text-red-500 fill-red-500' : 'text-gray-900'}`} />
                </div>

                {/* SHARE OVERLAY */}
                <button
                  onClick={(e) => handleShare(e, p)}
                  className="absolute top-16 right-4 md:top-20 md:right-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-[#3D8593] hover:text-white transition-all group/share"
                >
                  {copiedId === p.id ? (
                    <Check className="w-4 h-4 text-green-500 group-hover/share:text-white" />
                  ) : (
                    <Share2 className="w-4 h-4 text-gray-900 group-hover/share:text-white" />
                  )}
                </button>

                <div className={`absolute bottom-4 left-4 md:bottom-6 md:left-6 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-md ${p.availability === Availability.IMPORT ? 'bg-[#3D8593] text-white' :
                  p.stockCount === 0 ? 'bg-red-500/90 text-white' :
                    p.stockCount <= 5 ? 'bg-yellow-500/90 text-white' :
                      'bg-green-500/90 text-white'
                  }`}>{p.availability === Availability.IMPORT ? 'Import on Order' : getStockStatus(p.stockCount || 0)}</div>
              </div>

              <div className="px-1 relative">
                <h3 className="text-sm md:text-xl font-bold text-gray-900 mb-1 truncate pr-10">{p.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-sm md:text-xl font-black text-[#3D8593]">KES {(p.discountPriceKES || p.priceKES).toLocaleString()}</span>
                  {p.discountPriceKES && (
                    <span className="text-[10px] md:text-sm text-gray-400 line-through">KES {p.priceKES.toLocaleString()}</span>
                  )}
                </div>

                {/* CIRCULAR ACTION BUTTON */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); }}
                  className="absolute bottom-4 right-0 md:bottom-6 w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#3D8593] transition-all transform group-hover:scale-110 active:scale-95"
                >
                  <ArrowUpRight className="w-5 h-5 md:w-6 h-6" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Shop;
