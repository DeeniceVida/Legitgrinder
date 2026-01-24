import React, { useState, useEffect } from 'react';
import { ShoppingBag, Mail, Phone, MapPin, User, Loader2 } from 'lucide-react';

const Contact: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        location: '',
        product: '',
        price: 0,
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Get product info from URL params
        const params = new URLSearchParams(window.location.search);
        const product = params.get('product');
        const price = params.get('price');

        if (product) setFormData(prev => ({ ...prev, product }));
        if (price) setFormData(prev => ({ ...prev, price: Number(price) }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Here you would send to your backend/Supabase
        // For now, just simulate
        setTimeout(() => {
            alert('Order request received! We will contact you shortly.');
            window.location.href = '/';
        }, 1500);
    };

    return (
        <div className="max-w-3xl mx-auto py-24 px-6">
            <div className="text-center mb-12">
                <div className="inline-flex p-4 bg-[#FF9900] rounded-2xl text-white mb-6">
                    <ShoppingBag className="w-8 h-8" />
                </div>
                <h1 className="text-5xl font-bold tracking-tight-custom mb-4">Place Your Order</h1>
                <p className="text-neutral-500 font-light text-lg">Fill in your details and we'll get back to you within 24 hours</p>
            </div>

            <div className="bg-white rounded-[3rem] border border-neutral-100 p-12 shadow-xl">
                {formData.product && (
                    <div className="mb-8 p-6 bg-[#FF9900]/10 rounded-2xl border border-[#FF9900]/20">
                        <p className="text-sm font-bold text-neutral-600 mb-1">Selected Product</p>
                        <h3 className="text-2xl font-bold text-neutral-900">{formData.product}</h3>
                        <p className="text-lg font-bold text-[#FF9900] mt-2">KES {formData.price.toLocaleString()}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-600">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-600">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none"
                                    placeholder="+254 700 000 000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-600">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-600">Delivery Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 w-5 h-5" />
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                                className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 focus:border-[#FF9900] outline-none"
                                placeholder="Nairobi, Kenya"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-600">Additional Notes (Optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-4 bg-neutral-50 rounded-xl h-32 border border-neutral-200 focus:border-[#FF9900] outline-none resize-none"
                            placeholder="Any special requests or questions..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#FF9900] text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {loading ? 'Submitting...' : 'Submit Order Request'}
                    </button>

                    <p className="text-center text-sm text-neutral-500">
                        We'll contact you within 24 hours to confirm your order and payment details.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Contact;
