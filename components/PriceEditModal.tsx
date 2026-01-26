import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PricelistItem } from '../types';
import { calculateAutomatedPrice } from '../utils/priceCalculations';

interface PriceEditModalProps {
    pricelistItem: PricelistItem;
    capacityIndex: number;
    onClose: () => void;
    onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

const PriceEditModal: React.FC<PriceEditModalProps> = ({ pricelistItem, capacityIndex, onClose, onSave }) => {
    const cap = pricelistItem.capacities[capacityIndex];

    // Local state for the modal form to handle live updates
    const [localUSD, setLocalUSD] = useState(cap.sourcePriceUSD);
    const [localKES, setLocalKES] = useState(cap.currentPriceKES);

    // Auto-calculate KES when USD changes
    const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setLocalUSD(val);
        if (!isNaN(val)) {
            setLocalKES(calculateAutomatedPrice(val));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#0f1a1c]/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                <header className="px-10 py-8 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900">Manual Price Control</h3>
                        <p className="text-[10px] font-black uppercase text-[#3D8593] tracking-widest mt-1">{pricelistItem.modelName} • {cap.capacity}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </header>

                <form onSubmit={onSave} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Market USD Price</label>
                            <input
                                name="priceUSD"
                                type="number"
                                step="0.01"
                                value={localUSD}
                                onChange={handleUSDChange}
                                className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-lg"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block">Final KES Strategy</label>
                            <input
                                name="priceKES"
                                type="number"
                                value={localKES}
                                onChange={(e) => setLocalKES(parseInt(e.target.value) || 0)}
                                className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-teal-100 transition-all text-lg"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button type="submit" className="flex-1 py-5 bg-neutral-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                            Apply Override
                        </button>
                        <button type="button" onClick={onClose} className="px-8 py-5 bg-neutral-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PriceEditModal;
