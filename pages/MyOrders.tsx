import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, MapPin, ChevronRight } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { STATUS_SEQUENCE } from '../constants';

const MyOrders: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                window.location.href = '/login';
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', session.user.id)
                .order('date_placed', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIndex = (status: string) => {
        return STATUS_SEQUENCE.indexOf(status as any);
    };

    const getProgress = (status: string) => {
        const idx = getStatusIndex(status);
        return ((idx + 1) / STATUS_SEQUENCE.length) * 100;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9900] mx-auto mb-4"></div>
                    <p className="text-neutral-500">Loading your orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-24 px-6">
            <div className="mb-16">
                <h1 className="text-5xl font-bold tracking-tight-custom mb-4">My Orders</h1>
                <p className="text-neutral-400 font-light">Track your active global imports in real-time.</p>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-[3rem] border border-neutral-100 p-20 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                    <h3 className="text-2xl font-bold mb-2">No Orders Yet</h3>
                    <p className="text-neutral-500 mb-8">Start shopping to see your orders here</p>
                    <button
                        onClick={() => window.location.href = '/shop'}
                        className="bg-[#FF9900] text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-600"
                    >
                        Browse Products
                    </button>
                </div>
            ) : (
                <div className="space-y-10">
                    {orders.map((order) => {
                        const statusIdx = getStatusIndex(order.status);
                        const progress = getProgress(order.status);

                        return (
                            <div key={order.id} className="bg-white border border-neutral-100 rounded-[3rem] p-12 shadow-sm hover:shadow-xl transition-all">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-neutral-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
                                            <Package className="w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">
                                                Order #{order.id}
                                            </p>
                                            <h3 className="text-3xl font-bold text-neutral-900 tracking-tight-custom">
                                                {order.product_name}
                                            </h3>
                                            <p className="text-sm text-neutral-500 mt-1">
                                                Placed on {new Date(order.date_placed).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">
                                            Total Amount
                                        </p>
                                        <p className="text-3xl font-bold text-[#FF9900]">
                                            KES {order.total_cost_kes.toLocaleString()}
                                        </p>
                                        <p className={`text-sm font-bold mt-1 ${order.is_paid ? 'text-green-600' : 'text-amber-600'}`}>
                                            {order.is_paid ? '✓ Paid' : 'Payment Pending'}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative mb-12 px-2">
                                    <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-100 -translate-y-1/2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#FF9900] transition-all duration-1000"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="relative z-10 flex justify-between">
                                        {STATUS_SEQUENCE.map((s, i) => (
                                            <div key={s} className="flex flex-col items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all ${i <= statusIdx ? 'bg-[#FF9900] text-white scale-110' : 'bg-white text-neutral-200'
                                                    }`}>
                                                    {i < statusIdx ? <CheckCircle className="w-5 h-5" /> : (i === statusIdx ? <Clock className="w-5 h-5 animate-pulse" /> : <Package className="w-4 h-4" />)}
                                                </div>
                                                <p className={`absolute -bottom-8 text-[9px] font-black uppercase tracking-tighter w-20 text-center ${i <= statusIdx ? 'text-[#FF9900]' : 'text-neutral-300'
                                                    }`}>
                                                    {s}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-20 pt-10 border-t border-neutral-50 flex justify-between items-center">
                                    <div className="flex items-center gap-3 text-neutral-400">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm font-light italic">
                                            {order.mode} Shipping from {order.origin}
                                        </span>
                                    </div>
                                    <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF9900] hover:text-black transition-colors">
                                        View Details <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyOrders;
