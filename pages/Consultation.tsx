
import React, { useState } from 'react';
import { Calendar, Clock, MessageSquare, ShieldCheck, User, Mail, Phone, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../constants';
import { submitConsultation } from '../src/services/supabaseData';

const Consultation: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    date: '',
    time: '',
    topic: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { success } = await submitConsultation({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || formData.whatsapp, // Ensure phone is provided
      whatsapp: formData.whatsapp,
      topic: formData.topic,
      date: formData.date,
      time: formData.time
    });

    if (success) {
      setIsSubmitted(true);
    } else {
      alert('Failed to submit request. Please try again.');
    }
    setLoading(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen pt-48 pb-32 px-6 flex items-center justify-center bg-mesh">
        <div className="glass max-w-lg w-full p-12 rounded-[3.5rem] text-center shadow-2xl border-teal-100 animate-in zoom-in-95 duration-700">
          <div className="w-20 h-20 bg-teal-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-10 h-10 text-[#3D8593]" />
          </div>
          <h2 className="text-4xl font-bold mb-6 text-gray-900">Request Received!</h2>
          <p className="text-gray-500 font-light mb-10 leading-relaxed">
            Our sourcing team is checking if your project is doable. You will receive a WhatsApp notification shortly with confirmation and payment details for the <span className="text-[#3D8593] font-bold">$15 session fee</span>.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-vibrant-teal w-full py-5 rounded-full font-black uppercase text-[11px] tracking-widest"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen pt-48 pb-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 border border-orange-100 rounded-full mb-8">
              <Sparkles className="w-3.5 h-3.5 text-[#FF9900]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900]">Expert Strategy Session</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tighter text-gray-900 leading-[0.95]">
              Unlock Your <br />
              <span className="text-[#3D8593] italic font-light heading-accent">Import Potential.</span>
            </h1>
            <p className="text-xl md:text-2xl max-w-lg mb-12 text-gray-500 font-light leading-relaxed">
              Book a 1-on-1 session to discuss your sourcing needs, verify suppliers, and build a precision import strategy.
            </p>

            <div className="space-y-6">
              <div className="flex gap-6 items-center">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center">
                  <span className="text-xl font-black text-[#3D8593]">$15</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Consultation Fee</p>
                  <p className="text-sm text-gray-500">Credited back if you place an order.</p>
                </div>
              </div>
              <div className="flex gap-6 items-center">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Phone className="w-7 h-7 text-[#FF9900]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">30-Minute Deep Dive</p>
                  <p className="text-sm text-gray-500">Normal phone call or WhatsApp audio.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-10 md:p-14 rounded-[3.5rem] border-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
                    <input
                      required
                      className="w-full bg-teal-50/30 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#3D8593]/20 outline-none transition-all"
                      placeholder="Jane Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
                    <input
                      required
                      type="email"
                      className="w-full bg-teal-50/30 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#3D8593]/20 outline-none transition-all"
                      placeholder="jane@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">WhatsApp Number</label>
                  <div className="relative">
                    <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
                    <input
                      required
                      className="w-full bg-teal-50/30 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#3D8593]/20 outline-none transition-all"
                      placeholder="+254..."
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Preferred Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
                    <input
                      required
                      type="date"
                      className="w-full bg-teal-50/30 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#3D8593]/20 outline-none transition-all"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Preferred Time</label>
                <div className="relative">
                  <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300" />
                  <input
                    required
                    type="time"
                    className="w-full bg-teal-50/30 border-none rounded-2xl pl-12 pr-6 py-4 focus:ring-2 focus:ring-[#3D8593]/20 outline-none transition-all"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">What would you like to discuss?</label>
                <div className="relative">
                  <MessageSquare className="absolute left-5 top-6 w-4 h-4 text-teal-300" />
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-teal-50/30 border-none rounded-2xl pl-12 pr-6 py-5 focus:ring-2 focus:ring-[#3D8593]/20 outline-none transition-all resize-none"
                    placeholder="Tell us about the products you want to import..."
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-vibrant-orange w-full py-5 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3"
              >
                Request Session <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;
