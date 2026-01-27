
import React, { useState } from 'react';
import { X, Save, Image as ImageIcon, Tag, Package, Box, Clock, AlignLeft, DollarSign } from 'lucide-react';
import { Product, Availability } from '../types';

interface ProductEditModalProps {
    product: Product | null;
    onClose: () => void;
    onSave: (product: Product) => void;
    isUpdating?: boolean;
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, onClose, onSave, isUpdating }) => {
    const [formData, setFormData] = useState<Product>(product || {
        id: '',
        name: '',
        priceKES: 0,
        discountPriceKES: 0,
        imageUrls: [''],
        variations: [],
        availability: Availability.LOCAL,
        shippingDuration: '',
        description: '',
        category: '',
        stockCount: 0
    });

    if (!product) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md px-12 py-8 border-b border-neutral-100 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900">Edit Inventory Unit</h2>
                        <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-widest mt-1">Refine your product strategy</p>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-neutral-50 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-12 space-y-10">
                    <div className="grid md:grid-cols-2 gap-10">
                        {/* General Info */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Product Name</label>
                                <div className="relative">
                                    <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                    <input
                                        required
                                        className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all font-mono"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Price (KES)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                            value={formData.priceKES}
                                            onChange={e => setFormData({ ...formData, priceKES: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Discount Price</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                        <input
                                            type="number"
                                            className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                            value={formData.discountPriceKES || 0}
                                            onChange={e => setFormData({ ...formData, discountPriceKES: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Stock Status</label>
                                    <select
                                        className="w-full bg-neutral-50 border-none rounded-[1.5rem] px-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all appearance-none cursor-pointer"
                                        value={formData.availability}
                                        onChange={e => setFormData({ ...formData, availability: e.target.value as Availability })}
                                    >
                                        <option value={Availability.LOCAL}>Available Locally</option>
                                        <option value={Availability.IMPORT}>Import on Order</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Inventory Qty</label>
                                    <div className="relative">
                                        <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                        <input
                                            type="number"
                                            className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                            value={formData.stockCount || 0}
                                            onChange={e => setFormData({ ...formData, stockCount: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Media & Details */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Image URL</label>
                                <div className="relative">
                                    <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                    <input
                                        className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                        value={formData.imageUrls[0]}
                                        onChange={e => setFormData({ ...formData, imageUrls: [e.target.value] })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
                                <div className="relative">
                                    <Box className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                    <input
                                        className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Shipping Duration</label>
                                <div className="relative">
                                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                                    <input
                                        className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-8 py-5 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                        placeholder="e.g. 2-3 Business Days"
                                        value={formData.shippingDuration || ''}
                                        onChange={e => setFormData({ ...formData, shippingDuration: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-6 top-6 w-5 h-5 text-teal-300" />
                            <textarea
                                rows={4}
                                className="w-full bg-neutral-50 border-none rounded-[2rem] pl-16 pr-8 py-6 text-sm font-bold focus:ring-4 focus:ring-teal-100 transition-all resize-none"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="px-12 py-5 bg-[#3D8593] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal-100 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isUpdating ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductEditModal;
