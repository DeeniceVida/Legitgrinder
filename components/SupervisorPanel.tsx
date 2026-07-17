import React, { useEffect, useRef, useState } from 'react';
import {
  X, PaperPlaneTilt, Microphone, MicrophoneSlash, Sparkle, ArrowClockwise,
  Storefront, ChatCircleText, Truck, UsersThree, ArrowRight
} from '@phosphor-icons/react';
import { Invoice, Product } from '../types';
import { askSupervisor, SupervisorAction } from '../services/supervisor';
import { computeAttention, orderInternalStatus } from '../utils/logistics';
import { fetchGroupCampaigns, fetchGroupOrders, GroupCampaign, GroupOrder } from '../services/groupBuys';

interface Msg { role: 'user' | 'assistant'; content: string; action?: SupervisorAction }

interface SupervisorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  products: Product[];
  onAction: (action: SupervisorAction) => void;
}

const ACTION_META: Record<string, { label: string; Icon: React.ElementType }> = {
  open_catalog: { label: 'Open product writer', Icon: Storefront },
  draft_message: { label: 'Draft the message', Icon: ChatCircleText },
  open_tracking: { label: 'Open tracking', Icon: Truck },
  open_group_buys: { label: 'Open Group Buys', Icon: UsersThree }
};

const SupervisorPanel: React.FC<SupervisorPanelProps> = ({ isOpen, onClose, invoices, products, onAction }) => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hey Dennis 👋 I'm your Manager. Ask me about orders, group buys, or tell me what to do — \"remind Jane about her balance\", \"add a product\", \"which orders are at the port?\"" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);

  const [campaigns, setCampaigns] = useState<GroupCampaign[]>([]);
  const [gorders, setGorders] = useState<GroupOrder[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchGroupCampaigns().then(setCampaigns).catch(() => {});
      fetchGroupOrders().then(setGorders).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  const toggleVoice = () => {
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => setInput(prev => (prev ? prev + ' ' : '') + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  };

  const buildSnapshot = (): string => {
    const unpaid = invoices.filter(i => !i.isPaid).length;
    const attention = computeAttention(invoices);
    const lines: string[] = [];
    lines.push(`Orders: ${invoices.length} total, ${unpaid} unpaid. Products in shop: ${products.length}.`);
    if (attention.length) {
      lines.push(`NEEDS ATTENTION (${attention.length}):`);
      attention.forEach(a => lines.push(`- ${a.invoice.clientName} (IG-${a.invoice.invoiceNumber}): ${a.message}`));
    }
    lines.push('RECENT ORDERS:');
    invoices.slice(0, 12).forEach(i => {
      const bal = Math.max((i.totalKES || 0) - (i.amountPaidKES || 0), 0);
      lines.push(`- IG-${i.invoiceNumber} | ${i.clientName} | ${i.productName} | ${i.status} (internal ${orderInternalStatus(i)}) | balance KES ${bal.toLocaleString()} | ${i.origin || 'origin?'}`);
    });
    if (campaigns.length) {
      lines.push('GROUP BUYS:');
      campaigns.forEach(c => {
        const os = gorders.filter(o => o.campaignId === c.id);
        const collected = os.reduce((s, o) => s + o.amountPaidKES, 0);
        lines.push(`- ${c.title} (/group/${c.slug}) | ${c.status} | ${os.length} orders | KES ${collected.toLocaleString()} collected${c.closesAt ? ` | closes ${new Date(c.closesAt).toLocaleString('en-KE')}` : ''}`);
      });
    }
    return lines.join('\n');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setLoading(true);
    const res = await askSupervisor(next.map(m => ({ role: m.role, content: m.content })), buildSnapshot());
    setLoading(false);
    if (!res.success || !res.data) {
      setMessages(m => [...m, { role: 'assistant', content: res.error || 'Sorry, I hit a snag. Try again?' }]);
      return;
    }
    setMessages(m => [...m, { role: 'assistant', content: res.data!.reply, action: res.data!.action }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[95] w-[calc(100vw-3rem)] sm:w-[420px] h-[620px] max-h-[85vh] flex flex-col bg-brand-bg rounded-[1.75rem] border border-gray-100 shadow-2xl shadow-teal-900/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="relative shrink-0 bg-[#0f1a1c] text-white px-6 py-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D8593]/20 rounded-full -mr-12 -mt-12 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#7fc2ce]"><Sparkle size={22} weight="fill" /></span>
            <div>
              <span className="block font-bold tracking-tight leading-tight">Manager</span>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Your ops assistant</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"><X size={18} weight="bold" /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              <div className={`px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#3D8593] text-white rounded-2xl rounded-br-md' : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'}`}>
                {m.content}
              </div>
              {m.action && m.action.type !== 'none' && ACTION_META[m.action.type] && (
                <button
                  onClick={() => onAction(m.action!)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors"
                >
                  {React.createElement(ACTION_META[m.action.type].Icon, { size: 14, weight: 'fill' })}
                  {ACTION_META[m.action.type].label}
                  {m.action.invoice_number ? ` · IG-${m.action.invoice_number}` : ''}
                  <ArrowRight size={13} weight="bold" />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3.5 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D8593] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D8593] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D8593] animate-bounce [animation-delay:-0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 bg-white border-t border-gray-100">
        <div className="relative flex items-center gap-2">
          {SR && (
            <button
              onClick={toggleVoice}
              title={listening ? 'Stop' : 'Speak'}
              className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-brand-bg border border-gray-200 text-gray-500 hover:border-[#3D8593]'}`}
            >
              {listening ? <MicrophoneSlash size={18} weight="fill" /> : <Microphone size={18} weight="fill" />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={listening ? 'Listening…' : 'Ask or tell the Manager…'}
            className="flex-1 bg-brand-bg border border-gray-200 rounded-full pl-5 pr-4 py-3 text-sm font-medium focus:border-[#3D8593] outline-none transition-colors"
          />
          <button onClick={send} disabled={!input.trim() || loading} aria-label="Send" className="w-11 h-11 shrink-0 rounded-full bg-[#0f1a1c] text-white flex items-center justify-center hover:bg-[#3D8593] transition-colors disabled:opacity-30">
            {loading ? <ArrowClockwise size={16} weight="bold" className="animate-spin" /> : <PaperPlaneTilt size={16} weight="fill" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorPanel;
