import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, CheckCircle2, User, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

const Consultancy: React.FC = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Combine date and time
        const requestedDate = new Date(`${formData.date}T${formData.time}`);

        try {
            const { error } = await supabase.from('consultations').insert({
                client_name: formData.name,
                client_email: formData.email,
                client_phone: formData.phone,
                requested_date: requestedDate.toISOString(),
                notes: formData.notes,
                status: 'pending_approval'
            });

            if (error) throw error;
            setStep(3); // Success
        } catch (err) {
            console.error(err);
            alert("Failed to submit request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-24 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-16">
                <div className="inline-flex p-4 bg-[#FF9900]/10 text-[#FF9900] rounded-2xl mb-6">
                    <Calendar className="w-8 h-8" />
                </div>
                <h1 className="text-5xl font-bold tracking-tight-custom mb-6">Expert Consultation</h1>
                <p className="text-neutral-500 font-light text-lg max-w-2xl mx-auto">
                    Book a 30-minute dedicated session to plan your next major import. We'll verify suppliers, calculate landed costs, and logistics.
                </p>
            </div>

            <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-xl overflow-hidden p-12 relative">
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="flex gap-8 items-start border-b border-neutral-50 pb-8">
                            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0">
                                $15
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Strategy Session</h3>
                                <ul className="space-y-2 text-neutral-500 text-sm">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Supplier Verification</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Logistics Planning (Air vs Sea)</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cost Analysis Breakdown</li>
                                </ul>
                            </div>
                        </div>
                        <button onClick={() => setStep(2)} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-black transition-all">
                            Book Now
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-2">Name</label>
                                <input required type="text" className="w-full p-4 bg-neutral-50 rounded-xl" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-2">Email</label>
                                <input required type="email" className="w-full p-4 bg-neutral-50 rounded-xl" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-2">Preferred Date</label>
                                <input required type="date" className="w-full p-4 bg-neutral-50 rounded-xl" onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-2">Time</label>
                                <input required type="time" className="w-full p-4 bg-neutral-50 rounded-xl" onChange={e => setFormData({ ...formData, time: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-2">Topic / Questions</label>
                            <textarea className="w-full p-4 bg-neutral-50 rounded-xl h-32" onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setStep(1)} className="px-8 py-4 bg-white border border-neutral-200 rounded-2xl font-bold uppercase text-xs">Back</button>
                            <button type="submit" disabled={loading} className="flex-1 py-4 bg-[#FF9900] text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-600 transition-all">
                                {loading ? 'Processing...' : 'Confirm & Pay'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Request Received!</h2>
                        <p className="text-neutral-500 max-w-md mx-auto mb-8">
                            We have received your booking request. An admin will review the slot and send a payment link to <b>{formData.email}</b> shortly.
                        </p>
                        <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold uppercase text-xs">Back Home</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Consultancy;
