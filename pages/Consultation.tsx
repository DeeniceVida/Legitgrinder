import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarBlank, Clock, ChatCircleText, ShieldCheck, User, EnvelopeSimple,
  WhatsappLogo, ArrowRight, CheckCircle, WarningCircle, Phone
} from '@phosphor-icons/react';
import { submitConsultation } from '../services/supabaseData';
import { Reveal } from '../components/Motion';

const inputBase =
  'w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#3D8593] outline-none transition-colors shadow-sm';
const labelBase = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Combine date and time into a proper timestamp
      const requestedDateTime = new Date(`${formData.date}T${formData.time}`);

      const result = await submitConsultation({
        client_name: formData.name,
        client_email: formData.email,
        client_phone: formData.phone,
        client_whatsapp: formData.whatsapp,
        requested_date: requestedDateTime.toISOString(),
        topic: formData.topic
      });

      if (!result.success) {
        throw result.error;
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting consultation:', err);
      setError(err.message || 'Failed to submit consultation. Please try again or contact us on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6 flex items-center justify-center">
        <Reveal className="w-full max-w-lg">
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 text-center px-8 py-16">
            <CheckCircle size={64} weight="duotone" className="text-[#3D8593] mx-auto mb-7" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
              Request <span className="heading-accent italic font-light text-[#3D8593]">received.</span>
            </h2>
            <p className="text-gray-500 font-light leading-relaxed mb-10">
              I'm checking whether your project is doable. You'll get a WhatsApp message shortly with confirmation
              and payment details for the <span className="text-[#3D8593] font-bold">$15 session fee</span> — credited back when you place an order.
            </p>
            <Link
              to="/"
              className="inline-block px-9 py-4 bg-[#0f1a1c] text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#3D8593] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="bg-brand-bg min-h-screen pt-36 pb-28 px-4 md:px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* LEFT — pitch */}
        <Reveal>
          <div className="lg:pt-6">
            <p className="eyebrow text-[#3D8593] mb-4">1-on-1 Strategy Session</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 leading-[1.02]">
              Unlock your <span className="heading-accent italic font-light text-[#3D8593]">import potential.</span>
            </h1>
            <p className="text-gray-500 font-light text-lg leading-relaxed mb-10 max-w-lg">
              Book a private session to talk through your sourcing needs, verify suppliers, and build a
              precision import strategy tailored to your budget.
            </p>

            <div className="space-y-4">
              <div className="flex gap-5 items-center p-5 rounded-2xl bg-white border border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
                  <span className="text-lg font-black text-[#3D8593]">$15</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Consultation Fee</p>
                  <p className="text-sm text-gray-500 font-light">Credited back when you place an order.</p>
                </div>
              </div>
              <div className="flex gap-5 items-center p-5 rounded-2xl bg-white border border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Phone size={26} weight="duotone" className="text-[#FF9900]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">30-Minute Deep Dive</p>
                  <p className="text-sm text-gray-500 font-light">Regular phone call or WhatsApp audio.</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* RIGHT — form */}
        <Reveal delay={130}>
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-teal-900/5 p-7 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="c-name" className={labelBase}>Full Name</label>
                  <div className="relative">
                    <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input id="c-name" required className={inputBase} placeholder="Jane Wanjiku"
                      value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-email" className={labelBase}>Email</label>
                  <div className="relative">
                    <EnvelopeSimple size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input id="c-email" required type="email" className={inputBase} placeholder="jane@example.com"
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="c-whatsapp" className={labelBase}>WhatsApp Number</label>
                  <div className="relative">
                    <WhatsappLogo size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input id="c-whatsapp" required type="tel" className={inputBase} placeholder="+254…"
                      value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-date" className={labelBase}>Preferred Date</label>
                  <div className="relative">
                    <CalendarBlank size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input id="c-date" required type="date" className={inputBase}
                      value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="c-time" className={labelBase}>Preferred Time</label>
                <div className="relative">
                  <Clock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                  <input id="c-time" required type="time" className={inputBase}
                    value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label htmlFor="c-topic" className={labelBase}>What would you like to discuss?</label>
                <div className="relative">
                  <ChatCircleText size={17} className="absolute left-4 top-5 text-gray-300 pointer-events-none" />
                  <textarea id="c-topic" required rows={4}
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:border-[#3D8593] outline-none transition-colors shadow-sm resize-none"
                    placeholder="Tell me about the products you want to import…"
                    value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3" role="alert">
                  <WarningCircle size={20} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-900 mb-0.5">Submission failed</p>
                    <p className="text-xs text-rose-600">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-vibrant-orange shine w-full py-4 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting…' : (<>Request Session <ArrowRight size={15} weight="bold" /></>)}
              </button>

              <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <ShieldCheck size={14} weight="fill" className="text-emerald-500" /> Your details stay private
              </p>
            </form>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default Consultation;
