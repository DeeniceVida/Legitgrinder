import React, { useEffect, useRef, useState } from 'react';
import {
  X, PaperPlaneTilt, Microphone, MicrophoneSlash, UserGear, ArrowClockwise,
  Storefront, ChatCircleText, Truck, UsersThree, ArrowRight, SpeakerHigh, SpeakerSlash,
  CheckCircle
} from '@phosphor-icons/react';
import { Invoice, Product, Availability, OrderStatus, InternalStatus, PaymentStatus } from '../types';
import { askSupervisor, SupervisorAction } from '../services/supervisor';
import {
  computeAttention, orderInternalStatus, internalToClientStatus, internalToProgress,
  internalLabel, PIPELINE
} from '../utils/logistics';
import {
  fetchGroupCampaigns, fetchGroupOrders, createGroupCampaign, GroupCampaign, GroupOrder
} from '../services/groupBuys';
import { createManualInvoice, createProduct, updateOrderLogistics } from '../services/supabaseData';
import { normalizeKenyanPhone } from '../utils/phone';

interface Msg { role: 'user' | 'assistant'; content: string; action?: SupervisorAction; executed?: boolean }

interface SupervisorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  products: Product[];
  onAction: (action: SupervisorAction) => void;
  onOrderCreated: (inv: Invoice) => void;
  onProductCreated: (p: Product) => void;
  onInvoiceUpdated: (inv: Invoice) => void;
}

const ACTION_META: Record<string, { label: string; Icon: React.ElementType }> = {
  open_catalog: { label: 'Open product writer', Icon: Storefront },
  draft_message: { label: 'Draft the message', Icon: ChatCircleText },
  open_tracking: { label: 'Open tracking', Icon: Truck },
  open_group_buys: { label: 'Open Group Buys', Icon: UsersThree }
};

// Actions the Manager prepares fully and the panel executes after ONE confirm.
const EXEC_LABELS: Record<string, string> = {
  create_order: 'New order — ready to create',
  create_product: 'New listing — ready to publish',
  update_tracking: 'Tracking update — ready to apply',
  create_group_buy: 'Group buy — ready to launch'
};

const SupervisorPanel: React.FC<SupervisorPanelProps> = ({
  isOpen, onClose, invoices, products, onAction, onOrderCreated, onProductCreated, onInvoiceUpdated
}) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => localStorage.getItem('mgr_voice') !== 'off');
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Read a reply aloud (browser speech engine — free, no API cost).
  const speakText = (text: string) => {
    if (!canSpeak || !voiceOnRef.current) return;
    const clean = text
      .replace(/\p{Extended_Pictographic}/gu, '') // drop emoji
      .replace(/IG-(\d+)/g, 'order $1')           // "IG-214" reads as "order 214"
      .replace(/KES/g, 'K E S')
      .replace(/[•·|]/g, ', ');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-US';
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  };

  const toggleSpeaker = () => {
    setVoiceOn(v => {
      const next = !v;
      localStorage.setItem('mgr_voice', next ? 'on' : 'off');
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const langRef = useRef('en-KE'); // Kenyan English; falls back to en-US if unsupported
  const loadingRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  loadingRef.current = loading;

  const [campaigns, setCampaigns] = useState<GroupCampaign[]>([]);
  const [gorders, setGorders] = useState<GroupOrder[]>([]);
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);

  const markExecuted = (i: number) =>
    setMessages(ms => ms.map((m, idx) => (idx === i ? { ...m, executed: true } : m)));

  const finishOk = (i: number, text: string) => {
    markExecuted(i);
    setMessages(ms => [...ms, { role: 'assistant', content: text }]);
    speakText(text);
    setExecutingIndex(null);
  };

  const finishErr = (i: number, text: string) => {
    // Leave the card active so he can retry after fixing the issue.
    setMessages(ms => [...ms, { role: 'assistant', content: `❌ ${text}` }]);
    setExecutingIndex(null);
  };

  // Execute a prepared action after Dennis confirms. All writes reuse the same
  // authenticated service functions the dashboard's own forms use.
  const executeAction = async (i: number, action: SupervisorAction) => {
    if (executingIndex !== null) return;
    const p = action.payload || {};
    setExecutingIndex(i);
    try {
      switch (action.type) {
        case 'create_order': {
          const invoiceNumber = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
          const total = Number(p.total_kes) || 0;
          const clientWhatsapp = p.client_whatsapp ? normalizeKenyanPhone(p.client_whatsapp) : undefined;
          const r = await createManualInvoice({
            invoiceNumber,
            clientName: p.client_name || 'Client',
            clientWhatsapp,
            productName: p.product_name || 'Item',
            quantity: Number(p.quantity) || 1,
            totalKES: total,
            isPaid: !!p.is_paid
          });
          if (!r.success || !r.id) throw new Error(r.error?.message || 'could not save the order');
          const inv: Invoice = {
            id: r.id,
            invoiceNumber,
            clientName: p.client_name || 'Client',
            clientWhatsapp,
            productName: p.product_name || 'Item',
            quantity: Number(p.quantity) || 1,
            status: OrderStatus.RECEIVED_BY_AGENT,
            progress: 10,
            lastUpdate: 'Just now',
            isPaid: !!p.is_paid,
            paymentStatus: p.is_paid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
            totalKES: total,
            amountPaidKES: p.is_paid ? total : 0,
            createdAt: new Date().toISOString(),
            currency: 'KES'
          };
          onOrderCreated(inv);
          finishOk(i,
            `✅ Done — order IG-${invoiceNumber} created: ${inv.productName} for ${inv.clientName}, KES ${total.toLocaleString()}${inv.isPaid ? ' (paid)' : ''}.` +
            (!inv.isPaid ? `\nPay link: ${window.location.origin}/pay/${invoiceNumber}` : ''));
          break;
        }
        case 'create_product': {
          const isLocal = p.availability === 'Available Locally';
          const productData = {
            name: p.name || 'New product',
            priceKES: Number(p.price_kes) || 0,
            imageUrls: [] as string[],
            description: p.description || '',
            category: p.category || 'General',
            availability: isLocal ? Availability.LOCAL : Availability.IMPORT,
            stockCount: isLocal ? Number(p.stock_count) || 0 : 0,
            shippingDuration: p.shipping_duration || (isLocal ? '1-2 days' : '2-3 weeks'),
            variations: [] as Product['variations']
          };
          const r = await createProduct(productData);
          if (!r.success || !r.id) throw new Error(r.error?.message || 'could not save the product');
          onProductCreated({ id: r.id, ...productData });
          finishOk(i, `✅ Done — "${productData.name}" is live in the shop at KES ${productData.priceKES.toLocaleString()} (${productData.availability}). No images yet — add them from Stock when ready.`);
          break;
        }
        case 'update_tracking': {
          const num = (action.invoice_number || '').trim();
          const inv = invoices.find(x => x.invoiceNumber === num);
          if (!inv) throw new Error(`I can't find order IG-${num || '?'} — check the number`);
          const st = (p.internal_status || '') as InternalStatus;
          if (!PIPELINE.includes(st)) throw new Error(`"${p.internal_status || '?'}" isn't a tracking stage I know`);
          const clientStatus = internalToClientStatus(st);
          const progress = internalToProgress(st);
          const arrived = st === InternalStatus.ARRIVED_PORT && !inv.mombasaArrivedAt ? new Date().toISOString() : undefined;
          const r = await updateOrderLogistics(inv.id, {
            internalStatus: st,
            status: clientStatus as unknown as string,
            progress,
            ...(arrived ? { mombasaArrivedAt: arrived } : {})
          });
          if (!r.success) throw new Error(r.error?.message || 'could not update tracking');
          onInvoiceUpdated({ ...inv, internalStatus: st, status: clientStatus, progress, mombasaArrivedAt: arrived || inv.mombasaArrivedAt });
          finishOk(i, `✅ Done — IG-${num} moved to "${internalLabel(st, inv.origin)}". ${inv.clientName.split(' ')[0]} now sees "${clientStatus}" on their tracker.`);
          break;
        }
        case 'create_group_buy': {
          const unitPrice = Number(p.unit_price_kes) || 0;
          const minDeposit = Number(p.min_deposit_kes) || Math.round(unitPrice / 2);
          const r = await createGroupCampaign({
            title: p.title || 'Group Buy',
            description: p.description || undefined,
            unitPriceKES: unitPrice,
            minDepositKES: minDeposit,
            closesAt: p.closes_at || null
          });
          if (!r.success || !r.slug) throw new Error(r.error || 'could not create the campaign');
          finishOk(i,
            `✅ Done — group buy "${p.title}" is live:\n${window.location.origin}/group/${r.slug}\n` +
            `KES ${unitPrice.toLocaleString()}/unit, min deposit KES ${minDeposit.toLocaleString()}. Copy that link and post it.`);
          break;
        }
      }
    } catch (err: any) {
      finishErr(i, `Couldn't do it: ${err.message || 'unknown error'}. Nothing was changed — try again or do it manually.`);
    }
  };

  // Rows shown on the confirm card so Dennis sees exactly what will happen.
  const summarize = (a: SupervisorAction): [string, string][] => {
    const p = a.payload || {};
    switch (a.type) {
      case 'create_order':
        return ([
          ['Client', p.client_name || '—'],
          ...(p.client_whatsapp ? [['WhatsApp', p.client_whatsapp]] : []),
          ['Item', `${p.product_name || '—'}${(Number(p.quantity) || 1) > 1 ? ` × ${p.quantity}` : ''}`],
          ['Total', `KES ${(Number(p.total_kes) || 0).toLocaleString()}`],
          ['Payment', p.is_paid ? 'Already paid' : 'Unpaid — pay link comes after creation']
        ] as [string, string][]);
      case 'create_product':
        return ([
          ['Title', p.name || '—'],
          ['Category', p.category || '—'],
          ['Price', `KES ${(Number(p.price_kes) || 0).toLocaleString()}`],
          ['Availability', p.availability || 'Import on Order'],
          ...(p.availability === 'Available Locally' ? [['Stock', String(p.stock_count ?? 0)]] : []),
          ['Delivery', p.shipping_duration || '—']
        ] as [string, string][]);
      case 'update_tracking': {
        const st = (p.internal_status || '') as InternalStatus;
        const inv = invoices.find(x => x.invoiceNumber === a.invoice_number);
        return [
          ['Order', `IG-${a.invoice_number || '—'}${inv ? ` (${inv.clientName})` : ''}`],
          ['New stage', internalLabel(st, inv?.origin)],
          ['Client sees', internalToClientStatus(st)]
        ];
      }
      case 'create_group_buy':
        return ([
          ['Item', p.title || '—'],
          ['Price/unit', `KES ${(Number(p.unit_price_kes) || 0).toLocaleString()}`],
          ['Min deposit', `KES ${(Number(p.min_deposit_kes) || Math.round((Number(p.unit_price_kes) || 0) / 2)).toLocaleString()}`],
          ...(p.closes_at ? [['Closes', new Date(p.closes_at).toLocaleString('en-KE')]] : [])
        ] as [string, string][]);
      default:
        return [];
    }
  };

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
        : "Hey Dennis 👋 All clear right now — nothing urgent on the orders. Tell me what to do and I'll handle it: \"create an order for Jane, iPhone 15, 95k\", \"list a canvas bag at 7,000 bob, in stock, 5 pieces\", \"mark order 214 as ready\", \"launch a group buy\" — or just ask for a report.";
      return [{ role: 'assistant', content: greeting }];
    });
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Stop talking when the panel closes or unmounts.
  useEffect(() => {
    if (!isOpen) window.speechSynthesis?.cancel();
    return () => window.speechSynthesis?.cancel();
  }, [isOpen]);

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
    if (products.length) {
      lines.push(`SHOP STOCK (${Math.min(products.length, 40)} of ${products.length}):`);
      products.slice(0, 40).forEach(p =>
        lines.push(`- ${p.name} | ${p.category || 'uncategorised'} | KES ${(p.priceKES || 0).toLocaleString()} | ${p.availability} | stock ${p.stockCount ?? 0}`));
    }
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
    speakText(res.data.reply);
  };

  const toggleVoice = () => {
    if (!SR) {
      setMessages(m => [...m, { role: 'assistant', content: "Voice isn't supported in this browser — Chrome works best. You can still type." }]);
      return;
    }
    if (listening) { recRef.current?.stop(); return; }

    const rec = new SR();
    rec.lang = langRef.current;  // en-KE (Kenyan English) → much better accent pickup
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
      if (code === 'language-not-supported' && langRef.current !== 'en-US') {
        langRef.current = 'en-US'; // this device lacks en-KE — fall back quietly
        setMessages(m => [...m, { role: 'assistant', content: '🎤 Switched to standard English voice recognition — tap the mic again.' }]);
        return;
      }
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
          <div className="flex items-center gap-1.5">
            {canSpeak && (
              <button
                onClick={toggleSpeaker}
                title={voiceOn ? 'Mute the Manager' : 'Let the Manager talk back'}
                aria-label={voiceOn ? 'Mute replies' : 'Speak replies aloud'}
                className={`p-2 rounded-xl transition-colors ${voiceOn ? 'bg-[#3D8593]/40 text-[#7fc2ce]' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
              >
                {voiceOn ? <SpeakerHigh size={18} weight="fill" /> : <SpeakerSlash size={18} weight="fill" />}
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"><X size={18} weight="bold" /></button>
          </div>
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
              {m.action && m.action.type !== 'none' && EXEC_LABELS[m.action.type] && (
                <div className="w-full min-w-[16rem] bg-white border border-[#3D8593]/25 rounded-2xl p-4 space-y-2 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#3D8593]">{EXEC_LABELS[m.action.type]}</p>
                  {summarize(m.action).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-xs">
                      <span className="text-gray-400 font-bold shrink-0">{k}</span>
                      <span className="font-bold text-gray-800 text-right">{v}</span>
                    </div>
                  ))}
                  {m.action.type === 'create_product' && m.action.payload?.description && (
                    <p className="text-[11px] text-gray-500 leading-relaxed max-h-24 overflow-y-auto border-t border-gray-50 pt-2 whitespace-pre-line">
                      {m.action.payload.description}
                    </p>
                  )}
                  {m.executed ? (
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 pt-1">
                      <CheckCircle size={14} weight="fill" /> Handled
                    </p>
                  ) : (
                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={() => executeAction(i, m.action!)}
                        disabled={executingIndex !== null}
                        className="flex-1 py-2.5 rounded-full bg-[#0f1a1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#3D8593] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {executingIndex === i
                          ? (<><ArrowClockwise size={13} weight="bold" className="animate-spin" /> Doing it…</>)
                          : (<><CheckCircle size={13} weight="fill" /> Confirm — do it</>)}
                      </button>
                      <button
                        onClick={() => { markExecuted(i); setMessages(ms => [...ms, { role: 'assistant', content: 'Okay, cancelled — nothing was changed.' }]); }}
                        disabled={executingIndex !== null}
                        className="px-4 py-2.5 rounded-full border border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
              {m.action && m.action.type !== 'none' && !EXEC_LABELS[m.action.type] && ACTION_META[m.action.type] && (
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
