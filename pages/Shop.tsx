
import React, { useState } from 'react';
import { ShoppingCart, ChevronRight, ChevronLeft, Minus, Plus, Star, ChevronDown, ChevronUp, Package, Clock, Percent, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Availability, Product, ProductVariation } from '../types';
import { WHATSAPP_NUMBER } from '../constants';

interface ShopProps {
  products: Product[];
  onUpdateProducts?: (products: Product[]) => void;
}

const Shop: React.FC<ShopProps> = ({ products, onUpdateProducts }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('description');
  const [selectedVariations, setSelectedVariations] = useState<Record<string, ProductVariation>>({});

  const handleBuyNow = (p: Product) => {
    const varsString = Object.values(selectedVariations).map((v: ProductVariation) => `${v.type}: ${v.name}`).join(', ');
    const totalPrice = (p.discountPriceKES || p.priceKES) + (Object.values(selectedVariations) as ProductVariation[]).reduce((sum: number, v: ProductVariation) => sum + v.priceKES, 0);
    const text = encodeURIComponent(`Hi LegitGrinder, I'm interested in buying ${p.name}. ${varsString ? `(${varsString})` : ''} - (Availability: ${p.availability}). Total Price: KES ${totalPrice.toLocaleString()}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  if (selectedProduct) {
    const p = selectedProduct;
    const isLocal = p.availability === Availability.LOCAL;

    return (
      <div className="bg-white min-h-screen pt-32 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-12">
            <button onClick={() => setSelectedProduct(null)} className="hover:text-gray-900 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Home
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">Products</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-6">
              <div className="aspect-square bg-neutral-50 rounded-[2.5rem] overflow-hidden border border-neutral-100 relative">
                <img src={p.imageUrls[selectedImageIdx]} className="w-full h-full object-cover animate-in fade-in duration-500" alt={p.name} />
                <div className={`absolute top-6 left-6 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg ${isLocal ? 'bg-green-500 text-white' : 'bg-[#FF9900] text-white'}`}>
                  {isLocal ? 'In Stock' : 'On Import'}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {p.imageUrls.map((url, idx) => (
                  <button key={idx} onClick={() => setSelectedImageIdx(idx)} className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImageIdx === idx ? 'border-[#3D8593]' : 'border-transparent'}`}>
                    <img src={url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">{p.name}</h1>

              {/* Variation Selection */}
              <div className="space-y-8 mb-8 mt-4">
                {Object.entries(p.variations.reduce((acc, v) => {
                  if (!acc[v.type]) acc[v.type] = [];
                  acc[v.type].push(v);
                  return acc;
                }, {} as Record<string, ProductVariation[]>)).map(([type, items]: [string, ProductVariation[]]) => (
                  <div key={type}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">{type}</p>
                    <div className="flex flex-wrap gap-3">
                      {items.map((item, idx) => {
                        const isSelected = selectedVariations[type]?.name === item.name;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedVariations(prev => ({ ...prev, [type]: item }));
                              if (item.imageUrl) {
                                // Find if this image URL exists in imageUrls, if so set index
                                const imgIdx = p.imageUrls.indexOf(item.imageUrl);
                                if (imgIdx !== -1) setSelectedImageIdx(imgIdx);
                              }
                            }}
                            className={`px-6 py-3 rounded-xl text-xs font-bold transition-all border-2 ${isSelected
                              ? 'bg-[#3D8593] border-[#3D8593] text-white shadow-lg shadow-teal-100'
                              : 'bg-white border-neutral-100 text-gray-500 hover:border-[#3D8593]/30'
                              }`}
                          >
                            {item.name}
                            {item.priceKES > 0 && <span className="opacity-60 ml-2">+ {item.priceKES.toLocaleString()}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-3 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] block mb-2">Total Strategy Investment</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">
                    KES {((p.discountPriceKES || p.priceKES) + Object.values(selectedVariations).reduce((sum: number, v: ProductVariation) => sum + v.priceKES, 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className={`mb-8 p-5 rounded-3xl flex items-center gap-4 ${isLocal ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                {isLocal ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                <div>
                  <p className="font-bold text-sm">{isLocal ? 'In stock in Nairobi' : 'Available for import'}</p>
                  <p className="text-xs opacity-80">{isLocal ? 'Ready for pickup' : `ETA: ${p.shippingDuration || '3 Weeks'}`}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="border border-neutral-100 rounded-3xl overflow-hidden">
                  <button onClick={() => setActiveAccordion(activeAccordion === 'description' ? null : 'description')} className="w-full px-6 py-5 flex justify-between items-center hover:bg-neutral-50">
                    <span className="font-bold text-gray-900">Description</span>
                    {activeAccordion === 'description' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {activeAccordion === 'description' && <div className="px-6 pb-6 text-gray-500 font-light leading-relaxed">{p.description}</div>}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-10 mt-4">
                <div className="flex items-center bg-neutral-100 rounded-xl p-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-white rounded-lg transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 font-bold min-w-[3rem] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-white rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={() => handleBuyNow(p)} className="flex-1 py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-black transition-all">Buy Now</button>
              </div>

              <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center"><Percent className="w-5 h-5 text-gray-400" /></div>
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Discount</p><p className="text-sm font-bold">Included</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Courier</p><p className="text-sm font-bold">{isLocal ? 'Pickup' : 'Air'}</p></div>
                  </div>
                </div>
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
              <div className={`absolute top-6 right-6 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${p.availability === Availability.LOCAL ? 'bg-green-500 text-white' : 'bg-[#FF9900] text-white'}`}>{p.availability}</div>
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
