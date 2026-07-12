import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { WhatsappLogo, X, CaretRight } from '@phosphor-icons/react';
import { WHATSAPP_NUMBER } from '../constants';

/**
 * Floating WhatsApp launcher (replaces the AI chat bot).
 * Shows quick questions tailored to the page the visitor is on,
 * then hands over to WhatsApp with a pre-filled message.
 */

type Topic = { id: string; label: string; prompt: string; placeholder?: string };

const GENERAL: Topic[] = [
  { id: 'source', label: '🔎 Source an item for me', prompt: 'Hi LegitGrinder! I want you to source this item for me: ', placeholder: 'Item name or paste a link…' },
  { id: 'track', label: '📦 Track my order', prompt: 'Hi LegitGrinder! I would like an update on my order. My name / tracking code is: ', placeholder: 'Your name or tracking code…' },
  { id: 'other', label: '💬 Something else', prompt: 'Hi LegitGrinder! ', placeholder: 'Type your message…' },
];

// Page-specific quick questions, keyed by route prefix
const CONTEXT_TOPICS: { match: (path: string) => boolean; intro: string; topics: Topic[] }[] = [
  {
    match: (p) => p.startsWith('/shop'),
    intro: 'Shopping with us 🛍️ How can I help?',
    topics: [
      { id: 'avail', label: '📦 Is this item in stock?', prompt: 'Hi LegitGrinder! Is this item available in stock: ', placeholder: 'Which product?' },
      { id: 'ship', label: '🚚 Delivery time & cost', prompt: 'Hi LegitGrinder! How long is delivery and how much for: ', placeholder: 'Which product / your location?' },
      { id: 'pay', label: '💳 How do I pay?', prompt: 'Hi LegitGrinder! I would like to pay for: ', placeholder: 'Which product?' },
    ],
  },
  {
    match: (p) => p.startsWith('/pricelist'),
    intro: 'Looking at phone prices 📱 What do you need?',
    topics: [
      { id: 'model', label: '📱 Is this phone available?', prompt: 'Hi LegitGrinder! Is this phone in stock and what condition: ', placeholder: 'e.g. iPhone 14 Pro 256GB' },
      { id: 'import', label: '⏱️ How long to import?', prompt: 'Hi LegitGrinder! How long will it take to import: ', placeholder: 'Which phone?' },
      { id: 'trade', label: '🔁 Trade-in / other model', prompt: 'Hi LegitGrinder! I want a phone not on the list / to trade in: ', placeholder: 'Tell me more…' },
    ],
  },
  {
    match: (p) => p.startsWith('/blogs') || p.startsWith('/books'),
    intro: 'Got a question about our guides? 📚',
    topics: [
      { id: 'ebook', label: '📘 Ask about an eBook', prompt: 'Hi LegitGrinder! I have a question about your eBook: ', placeholder: 'Which eBook?' },
      { id: 'advice', label: '💡 Importing advice', prompt: 'Hi LegitGrinder! I need some importing advice about: ', placeholder: 'What would you like to know?' },
      { id: 'other', label: '💬 Something else', prompt: 'Hi LegitGrinder! ', placeholder: 'Type your message…' },
    ],
  },
  {
    match: (p) => p.startsWith('/calculators'),
    intro: 'Working out costs? 🧮 I can help.',
    topics: [
      { id: 'quote', label: '🧾 Get an exact quote', prompt: 'Hi LegitGrinder! Please give me an exact quote for: ', placeholder: 'Item + link or details…' },
      { id: 'ship', label: '🚢 Shipping options', prompt: 'Hi LegitGrinder! What are my shipping options (air/sea) for: ', placeholder: 'What are you importing?' },
      { id: 'other', label: '💬 Something else', prompt: 'Hi LegitGrinder! ', placeholder: 'Type your message…' },
    ],
  },
  {
    match: (p) => p.startsWith('/tracking') || p.startsWith('/history'),
    intro: 'Checking on an order? 📦',
    topics: [
      { id: 'status', label: '📍 Where is my order?', prompt: 'Hi LegitGrinder! Please update me on my order: ', placeholder: 'Name or tracking code…' },
      { id: 'delivery', label: '🏠 Arrange delivery', prompt: 'Hi LegitGrinder! I would like to arrange delivery for order: ', placeholder: 'Tracking code + location…' },
      { id: 'other', label: '💬 Something else', prompt: 'Hi LegitGrinder! ', placeholder: 'Type your message…' },
    ],
  },
];

const WhatsAppWidget: React.FC = () => {
  const location = useLocation();
  const ctx = CONTEXT_TOPICS.find(c => c.match(location.pathname));
  const topics = ctx?.topics || GENERAL;
  const intro = ctx?.intro || 'Hi there 👋 What can I help you with?';

  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [detail, setDetail] = useState('');

  // Reset the picker when navigating to a different section
  useEffect(() => { setTopic(null); setDetail(''); }, [location.pathname]);

  const reset = () => { setTopic(null); setDetail(''); };

  const launch = () => {
    const msg = encodeURIComponent(`${topic?.prompt || 'Hi LegitGrinder! '}${detail.trim()}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener');
    setOpen(false);
    reset();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[320px] bg-white rounded-3xl shadow-2xl shadow-teal-900/20 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[#075E54] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center">
                <WhatsappLogo size={20} weight="fill" />
              </span>
              <div>
                <p className="text-sm font-bold leading-none">LegitGrinder</p>
                <p className="text-[10px] text-white/70 mt-1">Typically replies fast on WhatsApp</p>
              </div>
            </div>
            <button onClick={() => { setOpen(false); reset(); }} aria-label="Close chat" className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            {!topic ? (
              <>
                <p className="text-xs font-bold text-gray-500 mb-3">{intro}</p>
                <div className="space-y-2">
                  {topics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopic(t)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-teal-50 border border-transparent hover:border-[#3D8593]/30 rounded-xl text-left text-sm font-bold text-gray-800 transition-all"
                    >
                      {t.label}
                      <CaretRight size={14} className="text-gray-300" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button onClick={reset} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#3D8593] mb-3">← Back</button>
                <p className="text-xs font-bold text-gray-700 mb-2">{topic.label}</p>
                <textarea
                  autoFocus
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={topic.placeholder || 'Type your message…'}
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium resize-none focus:border-[#25D366] transition-colors mb-3"
                />
                <button
                  onClick={launch}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#1eb855] text-white rounded-xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                  <WhatsappLogo size={18} weight="fill" /> Continue on WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close WhatsApp chat' : 'Chat on WhatsApp'}
        className="w-14 h-14 bg-[#25D366] hover:bg-[#1eb855] text-white rounded-full shadow-2xl shadow-emerald-900/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {open ? <X size={24} /> : <WhatsappLogo size={28} weight="fill" />}
      </button>
    </div>
  );
};

export default WhatsAppWidget;
