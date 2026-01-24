import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, ChevronRight, Truck, ShieldCheck, RefreshCw, Plus, Minus } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

const ProductDetails = ({ productId, onNavigate }: { productId: string, onNavigate: any }) => {
    const [product, setProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        // Fetch product details
        const fetchProduct = async () => {
            const { data } = await supabase.from('products').select('*').eq('id', productId).single();
            if (data) setProduct(data);
            else {
                // Fallback mock if database empty
                setProduct({
                    name: 'Elite Executive Chair',
                    priceKES: 24500,
                    description: 'Loose-fit sweatshirt hoodie in medium weight cotton blend fabric with a generous, but not oversized silhouette. Fleece-lined for comfort.',
                    images: ['https://images.unsplash.com/photo-1541558869434-2840d308329a?q=80&w=1000&auto=format&fit=crop'],
                    stockStatus: 'In Stock',
                    category: 'Furniture',
                    specifications: { Material: 'Leather', Color: 'Black', Warranty: '2 Years' }
                });
            }
        };
        fetchProduct();
    }, [productId]);

    if (!product) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const images = product.images && product.images.length > 0 ? product.images : [product.image];

    return (
        <div className="min-h-screen bg-[#F9F9F9] py-12 px-4 md:px-8">
            {/* Breadcrumbs */}
            <div className="max-w-7xl mx-auto mb-8 flex items-center gap-2 text-sm text-neutral-400 font-medium">
                <span className="cursor-pointer hover:text-black" onClick={() => onNavigate('home')}>Home</span>
                <ChevronRight className="w-4 h-4" />
                <span className="cursor-pointer hover:text-black" onClick={() => onNavigate('shop')}>Shop</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-black">{product.name}</span>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Gallery Section */}
                <div className="space-y-6">
                    <div className="aspect-square bg-[#F0F0F0] rounded-[2.5rem] overflow-hidden">
                        <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        {images.map((img: string, i: number) => (
                            <div
                                key={i}
                                className={`aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${activeImage === i ? 'border-[#FF9900]' : 'border-transparent'}`}
                                onClick={() => setActiveImage(i)}
                            >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Product Info Section */}
                <div className="animate-in slide-in-from-right-8 duration-700">
                    <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight-custom mb-4">{product.name}</h1>
                    <div className="flex items-center gap-4 mb-8">
                        <h2 className="text-3xl font-bold text-[#FF9900]">KES {product.priceKES?.toLocaleString()}</h2>
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${product.stockStatus === 'In Stock' ? 'bg-[#3B8392]/10 text-[#3B8392]' : 'bg-amber-100 text-amber-700'}`}>
                            {product.stockStatus}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 mb-8 shadow-sm">
                        <h3 className="font-bold mb-3">Description</h3>
                        <p className="text-neutral-500 leading-relaxed text-sm">
                            {product.description || 'Premium quality imported product delivered directly to you. Detailed inspection passed.'}
                        </p>
                    </div>

                    <div className="flex gap-6 mb-10">
                        <div className="flex items-center bg-white border border-neutral-200 rounded-xl px-4 py-3 gap-6">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1 hover:bg-neutral-100 rounded-lg"><Minus className="w-4 h-4" /></button>
                            <span className="font-bold w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="p-1 hover:bg-neutral-100 rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                        <button className="flex-1 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center justify-center gap-3">
                            Add To Cart
                        </button>
                        <button className="flex-1 bg-[#FF9900] text-white rounded-xl font-bold uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-200">
                            Buy Now
                        </button>
                    </div>

                    {/* Features / Trust Badges */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white border border-neutral-100 rounded-2xl flex items-center gap-4">
                            <div className="p-3 bg-neutral-50 rounded-xl"><Truck className="w-5 h-5 text-neutral-600" /></div>
                            <div>
                                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Delivery</p>
                                <p className="font-bold text-sm">Nationwide</p>
                            </div>
                        </div>
                        <div className="p-5 bg-white border border-neutral-100 rounded-2xl flex items-center gap-4">
                            <div className="p-3 bg-neutral-50 rounded-xl"><ShieldCheck className="w-5 h-5 text-neutral-600" /></div>
                            <div>
                                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Warranty</p>
                                <p className="font-bold text-sm">Verified Product</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Specifications Block */}
            <div className="max-w-7xl mx-auto mt-20">
                <h3 className="text-2xl font-bold mb-8">Specifications</h3>
                <div className="bg-white rounded-[2rem] p-8 border border-neutral-100 grid md:grid-cols-2 gap-8">
                    {product.specifications ? Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-neutral-100 pb-4">
                            <span className="font-medium text-neutral-500">{key}</span>
                            <span className="font-bold text-neutral-900">{value as any}</span>
                        </div>
                    )) : (
                        <div className="text-neutral-400">No additional specifications listed.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
