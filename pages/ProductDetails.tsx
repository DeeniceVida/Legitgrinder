import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, ChevronRight, Truck, ShieldCheck, RefreshCw, Plus, Minus, ArrowRight } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { WHATSAPP_NUMBER } from '../constants';

const ProductDetails = ({ productId, onNavigate }: { productId: string, onNavigate: any }) => {
    const [product, setProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<any>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            const { data } = await supabase.from('products').select('*').eq('id', productId).single();
            if (data) {
                setProduct(data);
                if (data.shop_variants && data.shop_variants.length > 0) {
                    setSelectedVariant(data.shop_variants[0]);
                }
            }
        };
        fetchProduct();
    }, [productId]);

    if (!product) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-[#3B8392]" /></div>;

    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image];

    const handleBuyNow = () => {
        const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
        const text = encodeURIComponent(`Hi LegitGrinder, I want to buy ${product.name}${variantText}. Qty: ${quantity}. Price: KES ${(product.priceKES * quantity).toLocaleString()}.`);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] py-12 px-4 md:px-8">
            {/* Breadcrumbs */}
            <div className="max-w-7xl mx-auto mb-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <span className="cursor-pointer hover:text-[#FF9900] transition-colors" onClick={() => onNavigate('home')}>Home</span>
                <ChevronRight className="w-3 h-3" />
                <span className="cursor-pointer hover:text-[#FF9900] transition-colors" onClick={() => onNavigate('shop')}>Shop</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-neutral-900">{product.name}</span>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                {/* Gallery Section */}
                <div className="space-y-6">
                    <div className="aspect-[4/5] bg-neutral-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-neutral-200/50 group">
                        <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                        {images.map((img: string, i: number) => (
                            <div
                                key={i}
                                className={`shrink-0 w-24 h-24 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${activeImage === i ? 'border-[#FF9900] scale-105 shadow-lg' : 'border-neutral-100 opacity-60 hover:opacity-100'}`}
                                onClick={() => setActiveImage(i)}
                            >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Product Info Section */}
                <div className="animate-in slide-in-from-right-12 duration-1000">
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-[#3B8392]/10 text-[#3B8392] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {product.category}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.stockStatus === 'In Stock' ? 'bg-green-100 text-green-700' : 'bg-[#FF9900]/10 text-[#FF9900]'}`}>
                                {product.stockStatus}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-medium text-neutral-900 tracking-tight-custom mb-6 leading-[1.1]">{product.name}</h1>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-4xl font-bold text-[#FF9900]">KES {product.priceKES?.toLocaleString()}</h2>
                            <span className="text-neutral-400 text-sm font-light uppercase tracking-widest">Global Sourcing Price</span>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Variation Selection */}
                        {product.shop_variants && product.shop_variants.length > 0 && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Select Option</label>
                                <div className="flex flex-wrap gap-3">
                                    {product.shop_variants.map((v: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`px-6 py-3 rounded-xl border-2 font-bold text-sm transition-all ${selectedVariant?.name === v.name ? 'border-[#3B8392] bg-[#3B8392]/5 text-[#3B8392] shadow-lg scale-105' : 'border-neutral-100 text-neutral-400 hover:border-neutral-200'}`}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Description</label>
                            <p className="text-neutral-500 leading-relaxed font-light text-lg">
                                {product.description || 'Professional-grade sourcing from verified global vendors. Our team handles inspections, logistics, and doorstep delivery.'}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 pt-6">
                            <div className="flex items-center bg-neutral-50 rounded-2xl p-2 h-16 w-full sm:w-auto">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-full flex items-center justify-center hover:bg-white rounded-xl transition-all"><Minus className="w-4 h-4" /></button>
                                <span className="w-12 text-center font-bold text-xl">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-full flex items-center justify-center hover:bg-white rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
                            </div>
                            <button onClick={handleBuyNow} className="flex-1 bg-black text-white h-16 rounded-2xl font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-2xl flex items-center justify-center gap-4 group">
                                Buy Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-10 border-t border-neutral-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-[#3B8392]"><Truck className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-900 border-none p-0 inline-block p-1 rounded-md">3 Week Delivery</p>
                                    <p className="text-xs text-neutral-400 font-light">Global Transit</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-[#3B8392]"><ShieldCheck className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-900">Verified Quality</p>
                                    <p className="text-xs text-neutral-400 font-light">Direct Source</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
