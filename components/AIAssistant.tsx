import React, { useState, useRef, useEffect } from 'react';
import { ChatCircleDots, X, PaperPlaneTilt, Headset } from '@phosphor-icons/react';
import { askAssistant } from '../services/gemini';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Jambo! I'm your LegitGrinder companion. Ask me anything about our logistics chain or current KES rates!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    const reply = await askAssistant(userMsg);
    setMessages(prev => [...prev, { role: 'assistant', content: reply || 'Sorry, my sensors are a bit hazy. Try again?' }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {isOpen ? (
        <div className="w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] max-h-[80vh] flex flex-col bg-brand-bg rounded-[1.75rem] border border-gray-100 shadow-2xl shadow-teal-900/15 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="relative shrink-0 bg-[#0f1a1c] text-white px-6 py-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3D8593]/20 rounded-full -mr-12 -mt-12 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#7fc2ce]">
                  <Headset size={22} weight="duotone" />
                </span>
                <div>
                  <span className="block font-bold tracking-tight leading-tight">LegitGrinder Assistant</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online now
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${m.role === 'user'
                  ? 'bg-[#3D8593] text-white rounded-2xl rounded-br-md'
                  : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'
                  }`}>
                  {m.content}
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
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="How long does USA air take?"
                aria-label="Type your message"
                className="w-full bg-brand-bg border border-gray-200 rounded-full pl-5 pr-14 py-3.5 text-sm font-medium focus:border-[#3D8593] outline-none transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="absolute right-1.5 w-9 h-9 rounded-full bg-[#0f1a1c] text-white flex items-center justify-center hover:bg-[#3D8593] transition-colors disabled:opacity-30"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
          className="group relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#0f1a1c] text-white shadow-2xl shadow-teal-900/25 flex items-center justify-center hover:bg-[#3D8593] hover:scale-105 transition-all duration-300"
        >
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#FF9900] border-2 border-[#0f1a1c]" aria-hidden="true" />
          <ChatCircleDots size={28} weight="duotone" className="w-7 h-7" />
        </button>
      )}
    </div>
  );
};

export default AIAssistant;
