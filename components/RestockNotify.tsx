import React, { useState } from 'react';
import { BellRinging, CheckCircle, CircleNotch } from '@phosphor-icons/react';
import { requestStockAlert } from '../services/supabaseData';

/**
 * "Notify me when back in stock" capture, shown in place of the buy button on
 * out-of-stock items. Saves the shopper's email to the waitlist; the admin's
 * restock action later emails everyone here.
 */
const RestockNotify: React.FC<{ productId: string; productName: string }> = ({ productId, productName }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'saving') return;
    setStatus('saving');
    setError('');
    const res = await requestStockAlert(productId, email);
    if (res.success) {
      setStatus('done');
    } else {
      setError(res.error || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-[1.75rem] p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
          <CheckCircle size={20} weight="fill" className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-1">You're on the list</p>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            We'll email you the moment <span className="font-bold text-gray-900">{productName}</span> is back in stock — so you can grab it before it sells out again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1a1c] p-7 rounded-[1.75rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/10 rounded-full -mr-16 -mt-16 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#FF9900]/15 rounded-2xl flex items-center justify-center shrink-0">
            <BellRinging size={20} weight="duotone" className="text-[#FF9900]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Out of stock</p>
            <p className="text-xs text-neutral-400 font-medium">Get an email the moment it's back.</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
            placeholder="you@email.com"
            aria-label="Your email"
            className="flex-1 bg-white/10 border border-white/15 rounded-full px-5 py-3.5 text-sm font-medium text-white placeholder:text-white/40 outline-none focus:border-[#FF9900] transition-colors"
          />
          <button
            type="submit"
            disabled={status === 'saving'}
            className="shrink-0 bg-[#FF9900] text-[#0f1a1c] px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {status === 'saving' ? <><CircleNotch size={14} weight="bold" className="animate-spin" /> Saving</> : 'Notify Me'}
          </button>
        </form>
        {status === 'error' && <p className="text-[11px] text-rose-300 font-medium mt-2 ml-1">{error}</p>}
      </div>
    </div>
  );
};

export default RestockNotify;
