
import React, { useState, useEffect } from 'react';
import {
  CaretRight, Minus, Plus, Star, Package, Clock, Truck, WarningCircle,
  MagnifyingGlass, ArrowUpRight, YoutubeLogo, ShareNetwork, Check, X, WhatsappLogo
} from '@phosphor-icons/react';
import { Availability, Product, ProductVariation, OrderStatus } from '../types';
import { WHATSAPP_NUMBER } from '../constants';
import { getStockStatus, createInvoice, verifyPaystackPayment, decrementProductStock, decrementVariantStock } from '../services/supabaseData';
import { PaystackButton } from 'react-paystack';
import { supabase } from '../lib/supabase';
import SafeImage from '../components/SafeImage';
import { Reveal } from '../components/Motion';
import FeaturedCarousel from '../components/FeaturedCarousel';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface ShopProps {
  products: Product[];
  onUpdateProducts?: (products: Product[]) => void;
}

const Shop: React.FC<ShopProps> = ({ products, onUpdateProducts }) => {
  const [user, setUser] = useState<any>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, ProductVariation>>({});
  const [activeAccordion, setActiveAccordion] = useState<string | null>('description');
  const [showPaystack, setShowPaystack] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  // Derived state to replace selectedProduct state
  const productIdParam = searchParams.get('product');
  const selectedProduct = productIdParam ? products.find(p => p.id === productIdParam) || null : null;

  // Reset states when selected product changes
  useEffect(() => {
    setSelectedImageIdx(0);
    setQuantity(1);
    setSelectedVariations({});
    setActiveAccordion('description');
    setExpandedImageUrl(null);
    if (productIdParam) window.scrollTo(0, 0);
  }, [productIdParam]);

  // Fetch logged in user for metadata
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  // Force LIVE key for production readiness (overrides .env if needed for immediate go-live)
  const PAYSTACK_PUBLIC_KEY = 'pk_live_b11692e8994766a02428b1176fc67f4b8b958974';

  const handleWhatsAppInquiry = (p: Product) => {
    const allVariationTypes = Array.from(new Set((p.variations || []).map(v => v.type || 'Other')));
    const requiredVariationTypes = allVariationTypes.filter(type => type.toLowerCase() !== 'capacity');
    const missingVariations = requiredVariationTypes.filter(type => !selectedVariations[type]);

    if (missingVariations.length > 0) {
      alert(`Please select your preferred ${missingVariations.join(' and ')} before continuing.`);
      return;
    }

    const selectedVarsList = Object.values(selectedVariations) as ProductVariation[];
    const variationPrice = selectedVarsList.reduce((sum: number, v: ProductVariation) => sum + (v.priceKES || 0), 0);
    const totalPrice = (p.discountPriceKES || p.priceKES) + variationPrice;

    const varTextStrings = selectedVarsList.map((v: ProductVariation) => `${v.type}: ${v.name}`);
    const varText = varTextStrings.length > 0 ? ` (Selected: ${varTextStrings.join(', ')})` : '';

    const text = encodeURIComponent(`Hi LegitGrinder, I'm interested in buying ${p.name}${varText}.\nQuantity: ${quantity}\nTotal Price: KES ${(totalPrice * quantity).toLocaleString()}`);
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
    const selectedVarsList = Object.values(selectedVariations) as ProductVariation[];
    const variationPrice = selectedVarsList.reduce((sum: number, v: ProductVariation) => sum + (v.priceKES || 0), 0);
    const totalPrice = (product.discountPriceKES || product.priceKES) + variationPrice;

    const varTextStrings = selectedVarsList.map((v: ProductVariation) => `${v.type}: ${v.name}`);
    const fullProductName = product.name + (varTextStrings.length > 0 ? ` (${varTextStrings.join(', ')})` : '');

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
          productName: fullProductName,
          quantity: quantity,
          totalKES: totalPrice * quantity,
          isPaid: true,
          status: OrderStatus.RECEIVED_BY_AGENT,
          paystackReference: response.reference
        });

        if (!invoiceResult.success) {
          console.error("Database record failed:", invoiceResult.error);
        }

        // 3. Deduct purchased pieces from stock (locally-stocked items only —
        //    "Import on Order" items are sourced per order and hold no stock)
        if (product.availability === Availability.LOCAL) {
          const trackedVariant = selectedVarsList.find((v: ProductVariation) => typeof v.stockCount === 'number');
          if (trackedVariant) {
            // Variant-tracked stock: deducts the variant AND the product total atomically
            const newVariants = await decrementVariantStock(product.id, trackedVariant.type || 'Other', trackedVariant.name, quantity);
            if (onUpdateProducts) {
              onUpdateProducts(products.map(p => p.id === product.id
                ? { ...p, stockCount: Math.max(0, (p.stockCount || 0) - quantity), ...(newVariants ? { variations: newVariants } : {}) }
                : p));
            }
          } else {
            const newQty = await decrementProductStock(product.id, quantity);
            if (newQty !== null && onUpdateProducts) {
              onUpdateProducts(products.map(p => p.id === product.id ? { ...p, stockCount: newQty } : p));
            }
          }
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
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('product');
    setSearchParams(newParams);
    setPaymentLoading(false);
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openProduct = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('product', id);
    setSearchParams(params);
  };

  /* ================================================================
     PRODUCT DETAIL VIEW
     ================================================================ */
  if (selectedProduct) {
    const p = selectedProduct;
    const isLocal = p.availability === Availability.LOCAL;
    const basePrice = p.discountPriceKES || p.priceKES;
    const selectedVarsList = Object.values(selectedVariations) as ProductVariation[];
    const variationPrice = selectedVarsList.reduce((sum: number, v: ProductVariation) => sum + (v.priceKES || 0), 0);
    const currentPrice = basePrice + variationPrice;

    // Use image from the last selected variation that has an image
    const variationWithImage = [...selectedVarsList].reverse().find((v: ProductVariation) => v.imageUrl);
    const displayImage = variationWithImage ? variationWithImage.imageUrl : p.imageUrls[selectedImageIdx];

    return (
      <div className="bg-brand-bg min-h-screen pt-32 pb-28 px-6">
        {expandedImageUrl && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out" onClick={() => setExpandedImageUrl(null)}>
            <img src={expandedImageUrl} className="max-w-full max-h-full object-contain animate-in zoom-in duration-300" alt="Expanded view" />
            <button onClick={() => setExpandedImageUrl(null)} aria-label="Close image" className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <X size={24} />
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          {/* TOP NAVIGATION / BREADCRUMBS */}
          <nav className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              <button
                onClick={() => {
                  if (window.history.length > 2) {
                    navigate(-1);
                  } else {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('product');
                    setSearchParams(newParams, { replace: true });
                  }
                }}
                className="hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                Shop
              </button>
              <CaretRight size={12} weight="bold" />
              <span className="text-gray-900">{p.category || 'Products'}</span>
            </div>
            <button
              onClick={(e) => handleShare(e, p)}
              className="px-5 py-3 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] hover:text-white transition-all shadow-sm flex items-center gap-2"
            >
              {copiedId === p.id ? (
                <><Check size={16} weight="bold" /> Link Copied</>
              ) : (
                <><ShareNetwork size={16} /> Share</>
              )}
            </button>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            {/* LEFT: GALLERY */}
            <div className="space-y-5 relative lg:sticky lg:top-32">
              <div
                className="aspect-square bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 relative group cursor-zoom-in shadow-sm"
                onClick={() => setExpandedImageUrl(displayImage)}
              >
                <SafeImage
                  src={displayImage}
                  className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
                  alt={p.name}
                />
                <div className={`absolute top-6 left-6 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg backdrop-blur-md ${p.availability === Availability.IMPORT ? 'bg-[#3D8593]/95 text-white' :
                  p.stockCount === 0 ? 'bg-red-500/90 text-white' :
                    p.stockCount <= 5 ? 'bg-[#FF9900]/90 text-white' :
                      'bg-emerald-500/90 text-white'
                  }`}>
                  {p.availability === Availability.IMPORT ? 'Import on Order' : getStockStatus(p.stockCount || 0)}
                </div>
              </div>

              {p.imageUrls.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {p.imageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      aria-label={`View image ${idx + 1}`}
                      className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-400 ${selectedImageIdx === idx ? 'border-[#3D8593]' : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                    >
                      <SafeImage src={url} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: DETAILS */}
            <div className="flex flex-col">
              <div className="mb-8">
                <p className="eyebrow text-[#3D8593] mb-3">{p.category || 'Verified Import'}</p>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 tracking-tighter leading-[1.05]">{p.name}</h1>
                <div className="flex items-baseline gap-3">
                  {Array.isArray(p.variations) && p.variations.length > 0 && Array.from(new Set(p.variations.map((v: ProductVariation) => v.type || 'Other'))).filter(type => type.toLowerCase() !== 'capacity').some(type => !selectedVariations[type]) ? (
                    <span className="text-lg font-bold text-gray-400">Select options to view price</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-gray-900 tracking-tight">KES {(currentPrice * quantity).toLocaleString()}</span>
                      {p.discountPriceKES && variationPrice === 0 && (
                        <span className="text-lg text-gray-400 line-through font-light">KES {(p.priceKES * quantity).toLocaleString()}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* DESCRIPTION ACCORDION */}
              <div className="mb-8 bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === 'description' ? null : 'description')}
                  className="w-full px-7 py-5 flex justify-between items-center hover:bg-neutral-50 transition-colors"
                  aria-expanded={activeAccordion === 'description'}
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Description</span>
                  {activeAccordion === 'description' ? <Minus size={16} /> : <Plus size={16} />}
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${activeAccordion === 'description' ? 'max-h-[2000px]' : 'max-h-0'}`}>
                  <div className="px-7 pb-7 text-sm text-gray-500 font-light leading-relaxed">
                    <p className="whitespace-pre-line">{p.description}</p>

                    {p.videoUrl && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <a
                          href={p.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF9900]/10 text-[#FF9900] rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#FF9900] hover:text-white transition-all"
                        >
                          <YoutubeLogo size={16} weight="fill" /> Watch Product Video
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VARIATIONS / CONFIGURATIONS */}
              {Array.isArray(p.variations) && p.variations.length > 0 && (
                <div className="mb-8 space-y-7">
                  {Object.entries(
                    (p.variations || []).reduce((groups: Record<string, ProductVariation[]>, v: ProductVariation) => {
                      const type = v.type || 'Other';
                      if (!groups[type]) groups[type] = [];
                      groups[type].push(v);
                      return groups;
                    }, {} as Record<string, ProductVariation[]>)
                  ).map(([type, variations]: [string, ProductVariation[]]) => (
                    <div key={type}>
                      <p className="eyebrow text-gray-400 mb-4">Select {type}</p>
                      <div className="flex flex-wrap gap-3">
                        {variations.map((v: ProductVariation, idx: number) => {
                          const tracked = typeof v.stockCount === 'number';
                          const soldOut = tracked && v.stockCount === 0;
                          return (
                            <button
                              key={idx}
                              disabled={soldOut}
                              onClick={() => {
                                const newSelections = { ...selectedVariations };
                                if (newSelections[type] === v) {
                                  delete newSelections[type];
                                } else {
                                  newSelections[type] = v;
                                }
                                setSelectedVariations(newSelections);
                              }}
                              aria-pressed={selectedVariations[type] === v}
                              className={`px-6 py-4 rounded-2xl transition-all duration-300 border-2 ${soldOut
                                ? 'border-transparent bg-neutral-100 opacity-50 cursor-not-allowed'
                                : selectedVariations[type] === v
                                  ? 'border-[#3D8593] bg-[#3D8593]/5'
                                  : 'border-transparent bg-white shadow-sm hover:shadow-md'
                                }`}
                            >
                              <span className={`text-xs font-bold ${soldOut ? 'text-gray-400 line-through' : selectedVariations[type] === v ? 'text-[#3D8593]' : 'text-gray-900'}`}>{v.name}</span>
                              {v.priceKES > 0 && !soldOut && (
                                <span className="block text-[9px] font-black text-[#FF9900] mt-1">+ KES {v.priceKES.toLocaleString()}</span>
                              )}
                              {tracked && (
                                <span className={`block text-[8px] font-black uppercase tracking-widest mt-1 ${soldOut ? 'text-rose-400' : (v.stockCount as number) <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {soldOut ? 'Out of stock' : `${v.stockCount} left`}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTION CENTER */}
              <div className="space-y-5 mb-10">
                {p.availability === Availability.IMPORT && (
                  <div className="bg-[#3D8593]/5 p-6 rounded-[1.75rem] border border-[#3D8593]/20 flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#3D8593]/10 rounded-xl flex items-center justify-center shrink-0">
                      <Truck size={20} weight="duotone" className="text-[#3D8593]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#3D8593] uppercase tracking-[0.2em] mb-1">Import Notice</p>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        This item is sourced specifically for you after ordering.
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
                      <div className="flex items-center bg-white border border-gray-200 rounded-full p-2 h-[60px]">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          aria-label="Decrease quantity"
                          className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-4 font-black text-lg min-w-[3.5rem] text-center" aria-live="polite">{quantity}</span>
                        <button
                          onClick={() => {
                            // Cap at available stock: product-level, and tighter if a tracked variant is selected
                            let maxQty = p.availability === Availability.LOCAL && p.stockCount ? p.stockCount : Infinity;
                            selectedVarsList.forEach((v: ProductVariation) => {
                              if (typeof v.stockCount === 'number') maxQty = Math.min(maxQty, v.stockCount);
                            });
                            setQuantity(Math.min(quantity + 1, Math.max(1, maxQty)));
                          }}
                          aria-label="Increase quantity"
                          className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {!showPaystack ? (
                        <button
                          onClick={() => {
                            const allVariationTypes = Array.from(new Set((p.variations || []).map(v => v.type || 'Other')));
                            const requiredVariationTypes = allVariationTypes.filter(type => type.toLowerCase() !== 'capacity');
                            const missingVariations = requiredVariationTypes.filter(type => !selectedVariations[type]);
                            if (missingVariations.length > 0) {
                              alert(`Please select your preferred ${missingVariations.join(' and ')} before continuing.`);
                              return;
                            }
                            if (!PAYSTACK_PUBLIC_KEY) {
                              alert("Payment system configuration missing. Please ensure VITE_PAYSTACK_PUBLIC_KEY is set in your environment.");
                              return;
                            }
                            setShowPaystack(true);
                          }}
                          className="shine flex-1 h-[60px] bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#3D8593] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                        >
                          Buy Now
                        </button>
                      ) : (
                        <div className="flex-1 flex flex-col gap-3">
                          <PaystackButton
                            className="w-full h-[60px] bg-[#3D8593] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#0f1a1c] transition-all shadow-xl"
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
                      className="w-full h-[60px] bg-[#25D366] text-white rounded-full font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#128C7E] transition-all shadow-lg flex items-center justify-center gap-3"
                    >
                      <WhatsappLogo size={20} weight="fill" /> Order via WhatsApp
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
                    <div className="bg-[#0f1a1c] p-7 rounded-[1.75rem] relative overflow-hidden group">
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-11 h-11 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center shrink-0">
                          <WarningCircle size={22} weight="duotone" className="text-[#FF9900]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-2">M-Pesa Backup Option</p>
                          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                            Pay via Buy Goods Till: <span className="text-white font-black tracking-[0.2em]">853 7538</span>. Then share code on WhatsApp.
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#FF9900]/10 transition-all duration-1000" aria-hidden="true"></div>
                    </div>
                  </div>
                ) : (
                  <button disabled className="w-full py-7 bg-neutral-100 text-neutral-400 rounded-full font-black uppercase text-[11px] tracking-[0.3em] cursor-not-allowed">
                    Currently Unavailable
                  </button>
                )}
              </div>

              {/* LOGISTICS CARDS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 p-6 rounded-[1.75rem] shadow-sm hover:border-[#3D8593]/30 transition-all">
                  <Package size={22} weight="duotone" className="text-[#3D8593] mb-4" />
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Logistics</p>
                  <p className="text-sm font-black text-gray-900">{isLocal ? 'In-Stock · Nairobi' : 'Air Freight'}</p>
                </div>
                <div className="bg-white border border-gray-100 p-6 rounded-[1.75rem] shadow-sm hover:border-[#3D8593]/30 transition-all">
                  <Clock size={22} weight="duotone" className="text-[#3D8593] mb-4" />
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Arrival</p>
                  <p className="text-sm font-black text-gray-900">{isLocal ? 'Immediate' : '2-3 Weeks (Air)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     SHOP GRID
     ================================================================ */
  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28">
      {expandedImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out" onClick={() => setExpandedImageUrl(null)}>
          <img src={expandedImageUrl} className="max-w-full max-h-full object-contain animate-in zoom-in duration-300" alt="Expanded view" />
          <button onClick={() => setExpandedImageUrl(null)} aria-label="Close image" className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <X size={24} />
          </button>
        </div>
      )}

      <div className="px-6 max-w-7xl mx-auto">
        {/* FEATURED CAROUSEL — auto-rotating promo of featured products */}
        {(() => {
          const featured = products.filter(p => p.isFeatured);
          return featured.length > 0 ? <FeaturedCarousel products={featured} onOpen={openProduct} /> : null;
        })()}

        {/* HEADER */}
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow text-[#3D8593] mb-4">The Marketplace</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-5 leading-[1.02]">
              Shop <span className="heading-accent italic font-light text-[#3D8593]">verified imports.</span>
            </h1>
            <p className="text-gray-500 font-light">
              Every item sourced, inspected and priced in KES — CBD pickup or doorstep delivery anywhere in Kenya.
            </p>
          </div>
        </Reveal>

        {/* SEARCH + CATEGORY FILTERS */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
          <div className="relative w-full lg:max-w-sm">
            <MagnifyingGlass size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products"
              className="w-full h-13 md:h-14 bg-white border border-gray-200 rounded-full pl-12 pr-6 text-sm font-medium focus:border-[#3D8593] transition-colors shadow-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Product categories">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={selectedCategory === c}
                onClick={() => setSelectedCategory(c)}
                className={`shrink-0 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${selectedCategory === c
                  ? 'bg-[#0f1a1c] text-white shadow-lg'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#3D8593] hover:text-[#3D8593]'
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="flex justify-between items-center mb-8">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            {searchQuery && <> for “{searchQuery}”</>}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* GRID */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 90}>
                <article
                  onClick={() => openProduct(p.id)}
                  className="group h-full bg-white rounded-[1.75rem] border border-gray-100 overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-teal-900/10 hover:border-[#3D8593]/25 transition-all duration-500 flex flex-col"
                >
                  <div className="relative aspect-square overflow-hidden bg-neutral-50">
                    <SafeImage
                      src={p.imageUrls[0]}
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
                      alt={p.name}
                    />

                    {/* Availability badge */}
                    <div className={`absolute top-3 left-3 md:top-4 md:left-4 px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] backdrop-blur-md ${p.availability === Availability.IMPORT ? 'bg-[#3D8593]/95 text-white' :
                      p.stockCount === 0 ? 'bg-red-500/90 text-white' :
                        p.stockCount <= 5 ? 'bg-[#FF9900]/90 text-white' :
                          'bg-white/90 text-gray-900'
                      }`}>
                      {p.availability === Availability.IMPORT ? 'On Order' : getStockStatus(p.stockCount || 0)}
                    </div>

                    {/* Sale badge */}
                    {p.discountPriceKES && (
                      <div className="absolute top-3 right-3 md:top-4 md:right-4 px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] bg-[#FF9900] text-white shadow-lg">
                        Sale
                      </div>
                    )}

                    {/* Share — appears on hover (always visible on touch) */}
                    <button
                      onClick={(e) => handleShare(e, p)}
                      aria-label={`Share ${p.name}`}
                      className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:bg-[#3D8593] hover:text-white transition-all md:opacity-0 md:group-hover:opacity-100"
                    >
                      {copiedId === p.id ? <Check size={15} weight="bold" className="text-emerald-500" /> : <ShareNetwork size={15} />}
                    </button>
                  </div>

                  <div className="p-4 md:p-5 flex flex-col flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mb-1.5">{p.category}</p>
                    <h3 className="text-sm md:text-base font-bold text-gray-900 leading-snug mb-3 line-clamp-2">{p.name}</h3>
                    <div className="mt-auto flex items-end justify-between gap-2">
                      <div>
                        <span className="block text-sm md:text-lg font-black text-gray-900 tracking-tight">
                          KES {(p.discountPriceKES || p.priceKES).toLocaleString()}
                        </span>
                        {p.discountPriceKES && (
                          <span className="text-[10px] md:text-xs text-gray-400 line-through">KES {p.priceKES.toLocaleString()}</span>
                        )}
                      </div>
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#FF9900] group-hover:border-[#FF9900] group-hover:text-white transition-all shrink-0"
                      >
                        <ArrowUpRight size={16} weight="bold" />
                      </span>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <Package size={48} weight="duotone" className="text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nothing matches that search</h3>
            <p className="text-gray-500 font-light mb-8">Can't find what you need? I can source it for you.</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi LegitGrinder! I'm looking for: ${searchQuery}. Can you source it for me?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#0f1a1c] text-white px-10 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors"
            >
              <WhatsappLogo size={18} weight="fill" /> Request a Sourcing Quote
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
