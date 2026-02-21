import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight, ShoppingBag, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Invoice, OrderStatus, getOrderProgress } from '../types';

interface OrderHistoryProps {
    invoices: Invoice[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ invoices }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-mesh min-h-screen pt-48 pb-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#3D8593] mb-8 hover:translate-x-[-4px] transition-transform"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Intelligence
                </Link>

                <div className="flex justify-between items-end mb-16">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tight mb-4">Order History</h1>
                        <p className="text-gray-500 text-lg">Manage your global acquisitions and track progress.</p>
                    </div>
                    <div className="hidden md:block">
                        <div className="px-6 py-4 bg-white rounded-3xl border border-neutral-100 shadow-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Active Shipments</p>
                            <p className="text-2xl font-black text-[#3D8593]">
                                {invoices.filter(i => i.status !== OrderStatus.READY_FOR_COLLECTION).length}
                            </p>
                        </div>
                    </div>
                </div>

                {invoices.length === 0 ? (
                    <div className="bg-white rounded-[3.5rem] shadow-2xl border border-neutral-100 p-20 text-center animate-in fade-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                            <ShoppingBag className="w-10 h-10 text-neutral-200" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">No acquisitions yet</h2>
                        <p className="text-gray-500 max-w-sm mx-auto mb-10 font-light leading-relaxed">
                            Your elite portfolio is currently empty. Start exploring our global shop to find your next asset.
                        </p>
                        <Link
                            to="/shop"
                            className="btn-vibrant-teal px-12 py-5 rounded-full font-black uppercase text-[11px] tracking-widest shadow-2xl transition-all inline-block"
                        >
                            Explore Shop
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {invoices.map((inv) => (
                            <div
                                key={inv.id}
                                className="bg-white rounded-[3rem] shadow-xl border border-neutral-100 p-8 md:p-10 hover:shadow-2xl transition-all group cursor-pointer overflow-hidden relative"
                                onClick={() => {
                                    navigate(`/tracking?id=${inv.invoiceNumber}`);
                                }}
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                    <div className="flex gap-8 items-center">
                                        <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center text-[#3D8593] group-hover:bg-[#3D8593] group-hover:text-white transition-colors">
                                            <Package className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#3D8593]">Invoice #{inv.invoiceNumber}</span>
                                                {inv.isPaid ? (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-[0.1em]">Payment Verified</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[8px] font-black uppercase tracking-[0.1em]">Pending Payment</span>
                                                )}
                                            </div>
                                            <h3 className="text-2xl font-bold tracking-tight mb-2 group-hover:text-[#3D8593] transition-colors">{inv.productName}</h3>
                                            <div className="flex items-center text-gray-400 gap-2 text-xs">
                                                <Clock className="w-4 h-4" />
                                                <span>Last updated: {inv.lastUpdate}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-10 w-full md:w-auto mt-4 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-neutral-50">
                                        <div className="flex-1 md:flex-none">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Current Phase</p>
                                            <p className="font-bold text-gray-900">{inv.status}</p>
                                        </div>
                                        <div className="w-24 h-24 relative flex items-center justify-center group/progress">
                                            {/* Background Track */}
                                            <svg className="absolute inset-0 transform -rotate-90">
                                                <circle
                                                    cx="48"
                                                    cy="48"
                                                    r="38"
                                                    stroke="#f3f4f6"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                />
                                            </svg>
                                            {/* Progress Track */}
                                            <svg className="absolute inset-0 transform -rotate-90">
                                                <defs>
                                                    <linearGradient id={`grad-${inv.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#3D8593" />
                                                        <stop offset="100%" stopColor="#2c626d" />
                                                    </linearGradient>
                                                </defs>
                                                <circle
                                                    cx="48"
                                                    cy="48"
                                                    r="38"
                                                    stroke={`url(#grad-${inv.id})`}
                                                    strokeWidth="8"
                                                    strokeLinecap="round"
                                                    fill="transparent"
                                                    className="transition-all duration-[1.5s] ease-out shadow-2xl"
                                                    strokeDasharray={238.7}
                                                    strokeDashoffset={238.7 - (238.7 * getOrderProgress(inv.status)) / 100}
                                                />
                                            </svg>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[12px] font-black leading-tight">{getOrderProgress(inv.status)}%</span>
                                                <span className="text-[6px] text-gray-400 font-bold uppercase tracking-tighter">Done</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-neutral-200 group-hover:text-[#3D8593] transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHistory;
