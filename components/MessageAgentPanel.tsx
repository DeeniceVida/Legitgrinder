import React, { useState } from 'react';
import {
  X, ArrowClockwise, WhatsappLogo, WarningCircle, PencilSimple,
  Copy, CheckCircle, BellRinging, Package, PaperPlaneTilt, HandHeart, ChatText
} from '@phosphor-icons/react';
import { draftClientMessage, MessageIntent } from '../services/messageAgent';
import { normalizeKenyanPhone } from '../utils/phone';
import { Invoice } from '../types';

interface MessageAgentPanelProps {
  invoice: Invoice | null;
  onClose: () => void;
  initialIntent?: MessageIntent;
}

const INTENTS: { id: MessageIntent; label: string; Icon: React.ElementType }[] = [
  { id: 'reminder', label: 'Payment reminder', Icon: BellRinging },
  { id: 'ready', label: 'Ready for pickup', Icon: Package },
  { id: 'shipped', label: 'Shipped / on the way', Icon: PaperPlaneTilt },
  { id: 'thanks', label: 'Thank you', Icon: HandHeart },
  { id: 'custom', label: 'Custom…', Icon: ChatText }
];

const MessageAgentPanel: React.FC<MessageAgentPanelProps> = ({ invoice, onClose, initialIntent }) => {
  const [intent, setIntent] = useState<MessageIntent>(initialIntent || 'reminder');
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://legitgrinder.com';
  const paidSoFar = invoice.amountPaidKES || 0;
  const balance = Math.max((invoice.totalKES || 0) - paidSoFar, 0);
  const payLink = `${origin}/pay/${invoice.invoiceNumber}`;
  const trackingLink = `${origin}/tracking?id=${invoice.invoiceNumber}`;
  const waNumber = normalizeKenyanPhone(invoice.clientWhatsapp);

  const handleGenerate = async () => {
    setError(null);
    if (intent === 'custom' && !custom.trim()) {
      setError('Tell the agent what the message should say.');
      return;
    }
    setLoading(true);
    const res = await draftClientMessage({
      intent,
      clientName: invoice.clientName,
      productName: invoice.productName,
      invoiceNumber: invoice.invoiceNumber,
      totalKES: invoice.totalKES,
      balanceKES: balance,
      isPaid: invoice.isPaid,
      status: invoice.status,
      payLink: balance > 0 ? payLink : undefined,
      trackingLink,
      custom: custom.trim() || undefined
    });
    setLoading(false);
    if (!res.success || !res.message) {
      setError(res.error || 'Could not draft a message.');
      return;
    }
    setMessage(res.message);
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(message);
    const url = waNumber ? `https://wa.me/${waNumber}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 md:p-8">
      <div className="w-full max-w-xl my-8 bg-brand-bg rounded-[1.75rem] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="relative bg-[#0f1a1c] text-white px-7 py-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#25D366]/15 rounded-full -mr-16 -mt-16 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#4ee286]">
                <WhatsappLogo size={22} weight="fill" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Message Writer</h2>
                <p className="text-[11px] text-white/50 font-medium">
                  {invoice.clientName} · {invoice.invoiceNumber}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-7 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3" role="alert">
              <WarningCircle size={20} weight="duotone" className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* status line */}
          <div className="flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
            <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200">{invoice.status}</span>
            {balance > 0
              ? <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-600">Balance KES {balance.toLocaleString()}</span>
              : <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center gap-1.5"><CheckCircle size={12} weight="fill" /> Paid</span>}
            {!waNumber && <span className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-500">No WhatsApp number on file</span>}
          </div>

          {/* intent chips */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">What's the message?</span>
            <div className="flex flex-wrap gap-2">
              {INTENTS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => { setIntent(id); setMessage(''); }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${intent === id
                    ? 'bg-[#0f1a1c] text-white border-[#0f1a1c]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#3D8593] hover:text-[#3D8593]'}`}
                >
                  <Icon size={14} weight={intent === id ? 'fill' : 'duotone'} /> {label}
                </button>
              ))}
            </div>
          </div>

          {intent === 'custom' && (
            <div>
              <label htmlFor="msg-custom" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">Your instruction</label>
              <input
                id="msg-custom"
                placeholder="e.g. ask them to confirm their delivery address"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium focus:border-[#3D8593] outline-none transition-colors"
                value={custom} onChange={e => setCustom(e.target.value)}
              />
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-vibrant-teal w-full py-4 rounded-full font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2.5 disabled:opacity-40"
          >
            {loading
              ? (<><ArrowClockwise size={16} weight="bold" className="animate-spin" /> Writing…</>)
              : (<><PencilSimple size={16} weight="fill" /> {message ? 'Rewrite' : 'Write message'}</>)}
          </button>

          {message && (
            <>
              <div>
                <label htmlFor="msg-body" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
                  Review &amp; edit — you send it, not the bot
                </label>
                <textarea
                  id="msg-body" rows={7}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium leading-relaxed text-gray-800 focus:border-[#3D8593] outline-none transition-colors resize-none"
                  value={message} onChange={e => setMessage(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={copyMessage}
                  className="px-5 py-4 rounded-full font-black uppercase text-[11px] tracking-widest text-gray-500 border border-gray-200 hover:bg-white transition-colors inline-flex items-center gap-2">
                  {copied ? <><CheckCircle size={15} weight="fill" className="text-emerald-500" /> Copied</> : <><Copy size={15} weight="bold" /> Copy</>}
                </button>
                <button onClick={openWhatsApp}
                  className="flex-1 py-4 rounded-full bg-[#25D366] text-white font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2.5 hover:bg-[#1eb955] transition-colors">
                  <WhatsappLogo size={17} weight="fill" /> {waNumber ? 'Open in WhatsApp' : 'Open WhatsApp (pick contact)'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 font-medium text-center">
                WhatsApp opens with the message ready — you press send. Nothing is sent automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageAgentPanel;
