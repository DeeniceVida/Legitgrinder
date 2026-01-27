
import React, { useState } from 'react';
import { X, Save, Image as ImageIcon, Tag, Package, Box, Clock, AlignLeft, DollarSign, Plus, Trash2, Layers } from 'lucide-react';
import { Product, Availability, ProductVariation } from '../types';

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

    const handleAddImage = () => {
        setFormData({ ...formData, imageUrls: [...formData.imageUrls, ''] });
    };

    const handleRemoveImage = (index: number) => {
        const newImages = formData.imageUrls.filter((_, i) => i !== index);
        setFormData({ ...formData, imageUrls: newImages.length > 0 ? newImages : [''] });
    };

    const handleImageChange = (index: number, value: string) => {
        const newImages = [...formData.imageUrls];
        newImages[index] = value;
        setFormData({ ...formData, imageUrls: newImages });
    };

    const handleAddVariation = () => {
        const newVar: ProductVariation = { type: 'Color', name: '', priceKES: 0 };
        setFormData({ ...formData, variations: [...(formData.variations || []), newVar] });
    };

    const handleRemoveVariation = (index: number) => {
        const newVars = formData.variations.filter((_, i) => i !== index);
        setFormData({ ...formData, variations: newVars });
    };

    const handleVariationChange = (index: number, field: keyof ProductVariation, value: any) => {
        const newVars = [...formData.variations];
        newVars[index] = { ...newVars[index], [field]: value };
        setFormData({ ...formData, variations: newVars });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submission triggered with data:', formData);
        // Filter out empty images
        const cleanedImages = formData.imageUrls.filter(url => url.trim() !== '');
        onSave({ ...formData, imageUrls: cleanedImages.length > 0 ? cleanedImages : formData.imageUrls });
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
                            <div className="space-y-4">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Image Gallery</label>
                                    <button
                                        type="button"
                                        onClick={handleAddImage}
                                        className="text-[10px] font-black uppercase tracking-widest text-[#3D8593] flex items-center gap-1 hover:opacity-70"
                                    >
                                        <Plus className="w-3 h-3" /> Add Image
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                                    {formData.imageUrls.map((url, idx) => (
                                        <div key={idx} className="relative group">
                                            <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300 pointer-events-none" />
                                            <input
                                                className="w-full bg-neutral-50 border-none rounded-[1.5rem] pl-16 pr-12 py-5 text-xs font-bold focus:ring-4 focus:ring-teal-100 transition-all"
                                                placeholder="https://image-url.com"
                                                value={url}
                                                onChange={e => handleImageChange(idx, e.target.value)}
                                            />
                                            {formData.imageUrls.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(idx)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-rose-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
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

                    {/* Variations Section */}
                    <div className="space-y-6 pt-6 border-t border-neutral-100">
                        <div className="flex justify-between items-center ml-1">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[#3D8593]">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Market Variations</h3>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Colors, Sizes, and Pricing adjustments</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddVariation}
                                className="bg-white border border-neutral-200 p-3 rounded-xl text-gray-400 hover:text-[#3D8593] hover:border-[#3D8593] transition-all shadow-sm"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {formData.variations.map((v, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-neutral-50/50 p-6 rounded-[2rem] border border-neutral-100 animate-in slide-in-from-right-4 duration-300">
                                    <div className="col-span-2">
                                        <select
                                            className="w-full bg-white border-none rounded-xl px-4 py-4 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-teal-100 transition-all appearance-none cursor-pointer text-gray-600 shadow-sm"
                                            value={v.type}
                                            onChange={e => handleVariationChange(idx, 'type', e.target.value)}
                                        >
                                            <option value="Color">Color</option>
                                            <option value="Size">Size</option>
                                            <option value="Capacity">Capacity</option>
                                            <option value="Design">Design</option>
                                            <option value="Bundle">Bundle</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            className="w-full bg-white border-none rounded-xl px-4 py-4 text-xs font-bold focus:ring-4 focus:ring-teal-100 transition-all shadow-sm"
                                            placeholder="Variation Name"
                                            value={v.name}
                                            onChange={e => handleVariationChange(idx, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2 relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-300 pointer-events-none" />
                                        <input
                                            type="number"
                                            className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-4 text-xs font-bold focus:ring-4 focus:ring-teal-100 transition-all shadow-sm"
                                            placeholder="Offset"
                                            value={v.priceKES}
                                            onChange={e => handleVariationChange(idx, 'priceKES', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="col-span-4 relative">
                                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-300 pointer-events-none" />
                                        <input
                                            className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-4 text-xs font-bold focus:ring-4 focus:ring-teal-100 transition-all shadow-sm"
                                            placeholder="Image URL (Optional)"
                                            value={v.imageUrl || ''}
                                            onChange={e => handleVariationChange(idx, 'imageUrl', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVariation(idx)}
                                            className="p-3 bg-white border border-rose-100 text-rose-300 hover:text-rose-500 hover:border-rose-300 rounded-xl transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {formData.variations.length === 0 && (
                                <div className="text-center py-10 bg-neutral-50/30 rounded-[2.5rem] border-2 border-dashed border-neutral-100">
                                    <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.2em]">No variations defined for this unit</p>
                                </div>
                            )}
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
