import React, { useEffect, useRef, useState } from 'react';
import {
  X, PaperPlaneTilt, Microphone, MicrophoneSlash, UserGear, ArrowClockwise,
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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const loadingRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  loadingRef.current = loading;

  const [campaigns, setCampaigns] = useState<GroupCampaign[]>([]);
  const [gorders, setGorders] = useState<GroupOrder[]>([]);

  // Opening brief: greet with what actually needs attention (a mini report).
  useEffect(() => {
    if (!isOpen) return;
    fetchGroupCampaigns().then(setCampaigns).catch(() => {});
    fetchGroupOrders().then(setGorders).catch(() => {});
    setMessages(prev => {
      if (prev.length > 0) return prev; // keep the running conversation
      const att = computeAttention(invoices);
      const greeting = att.length
        ? `Hey Dennis 👋 ${att.length} thing${att.length > 1 ? 's' : ''} need${att.length > 1 ? '' : 's'} you today:\n` +
          att.slice(0, 5).map(a => `• ${a.invoice.clientName} (IG-${a.invoice.invoiceNumber}) — ${a.message}`).join('\n') +
          (att.length > 5 ? `\n…and ${att.length - 5} more in the Action Center.` : '') +
          `\n\nAsk me for details or tell me what to do.`
        : "Hey Dennis 👋 All clear right now — nothing urgent on the orders. Ask me for a report, or tell me what to do: \"remind Jane about her balance\", \"add a product\", \"how's the monitor group buy?\"";
      return [{ role: 'assistant', content: greeting }];
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  const buildSnapshot = (): string => {
    const unpaid = invoices.filter(i => !i.isPaid);
    const outstanding = unpaid.reduce((s, i) => s + Math.max((i.totalKES || 0) - (i.amountPaidKES || 0), 0), 0);
    const attention = computeAttention(invoices);
    const lines: string[] = [];
    lines.push(`Orders: ${invoices.length} total, ${unpaid.length} unpaid (KES ${outstanding.toLocaleString()} outstanding). Products in shop: ${products.length}.`);
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

  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || loadingRef.current) return;
    setInput('');
    const next = [...messagesRef.current, { role: 'user' as const, content: text }];
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

  const toggleVoice = () => {
    if (!SR) {
      setMessages(m => [...m, { role: 'assistant', content: "Voice isn't supported in this browser — Chrome works best. You can still type." }]);
      return;
    }
    if (listening) { recRef.current?.stop(); return; }

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;   // show words as you speak
    rec.continuous = false;
    let finalText = '';
    let errored = false;

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = (e: any) => {
      errored = true;
      setListening(false);
      const code = e?.error || 'unknown';
      const hint =
        code === 'not-allowed' || code === 'service-not-allowed'
          ? '🎤 The microphone is blocked. Click the lock icon in the address bar → Site settings → allow Microphone, then try again.'
          : code === 'no-speech'
            ? "🎤 I didn't catch anything — tap the mic and speak right away."
            : code === 'audio-capture'
              ? '🎤 No microphone found on this device.'
              : code === 'network'
                ? "🎤 This browser's voice service isn't reachable — voice works best in Chrome. You can still type."
                : `🎤 Mic error (${code}) — you can still type.`;
      setMessages(m => [...m, { role: 'assistant', content: hint }]);
    };
    rec.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (text && !errored) sendText(text); // speak → it sends itself
    };

    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[95] w-[calc(100vw-3rem)] sm:w-[420px] h-[620px] max-h-[85vh] flex flex-col bg-brand-bg rounded-[1.75rem] border border-gray-100 shadow-2xl shadow-teal-900/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="relative shrink-0 bg-[#0f1a1c] text-white px-6 py-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D8593]/20 rounded-full -mr-12 -mt-12 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#7fc2ce]"><UserGear size={22} weight="duotone" /></span>
            <div>
              <span className="block font-bold tracking-tight leading-tight">Manager</span>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Operations</span>
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
              <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'bg-[#3D8593] text-white rounded-2xl rounded-br-md' : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'}`}>
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
          <button
            onClick={toggleVoice}
            title={listening ? 'Stop listening' : 'Speak to the Manager'}
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-brand-bg border border-gray-200 text-gray-500 hover:border-[#3D8593] hover:text-[#3D8593]'}`}
          >
            {listening ? <MicrophoneSlash size={18} weight="fill" /> : <Microphone size={18} weight="fill" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendText(input)}
            placeholder={listening ? 'Listening… speak now' : 'Ask or tell the Manager…'}
            className="flex-1 bg-brand-bg border border-gray-200 rounded-full pl-5 pr-4 py-3 text-sm font-medium focus:border-[#3D8593] outline-none transition-colors"
          />
          <button onClick={() => sendText(input)} disabled={!input.trim() || loading} aria-label="Send" className="w-11 h-11 shrink-0 rounded-full bg-[#0f1a1c] text-white flex items-center justify-center hover:bg-[#3D8593] transition-colors disabled:opacity-30">
            {loading ? <ArrowClockwise size={16} weight="bold" className="animate-spin" /> : <PaperPlaneTilt size={16} weight="fill" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorPanel;
