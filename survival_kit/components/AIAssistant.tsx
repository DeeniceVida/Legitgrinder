
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { askAssistant } from '../services/gemini';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Jambo! I'm your LegitGrinder companion. Ask me anything about our logistics chain or current KES rates!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "How long does USA air take?",
    "China shipping rates?",
    "iPhone 15 Pro price calculation",
    "Where is your office?"
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const handleSend = async (customMsg?: string) => {
    const msgToSend = customMsg || input;
    if (!msgToSend.trim() || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: msgToSend }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Pass the history (excluding the very first greeting)
      const reply = await askAssistant(msgToSend, messages.slice(1));
      setMessages(prev => [...prev, { role: 'assistant', content: reply || 'Sorry, my sensors are a bit hazy. Try again?' }]);
    } catch (error) {
      console.error("Error in AIAssistant:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[60]">
      {isOpen ? (
        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(79,70,229,0.3)] w-80 sm:w-[420px] flex flex-col h-[650px] border border-indigo-50 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          {/* Header */}
          <div className="bg-indigo-600 p-8 flex justify-between items-center text-white relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-800"></div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF9900]/20 rounded-full blur-3xl"></div>

            <div className="flex items-center space-x-4 relative z-10">
              <div className="bg-white p-3 rounded-2xl shadow-xl">
                <Bot className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <span className="font-black block text-sm uppercase tracking-widest">Legit.AI</span>
                <span className="text-[10px] opacity-80 font-bold flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  GLOBAL NETWORK ACTIVE
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-mesh">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] rounded-[1.8rem] p-5 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100'
                  : 'bg-white text-gray-800 rounded-bl-none border border-indigo-50 shadow-indigo-50/50'
                  }`}>
                  <div className="whitespace-pre-wrap">
                    {m.content.split('\n').map((line, idx) => {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? "mt-1 text-gray-700" : ""}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pIdx} className="font-extrabold text-indigo-950 underline decoration-indigo-200/50 decoration-2 underline-offset-2">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-indigo-50 rounded-[1.8rem] p-5 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#FF9900] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                </div>
              </div>
            )}

            {!loading && messages.length === 1 && (
              <div className="pt-4 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">Quick Inquiries</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-full transition-all border border-indigo-100/50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-8 bg-white border-t border-indigo-50 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="How long does USA air take?"
                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] pl-6 pr-14 py-4 text-sm focus:outline-none focus:border-indigo-600/20 focus:bg-white transition-all shadow-inner"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 bg-indigo-600 text-white p-3 rounded-xl hover:bg-[#FF9900] transition-all disabled:opacity-50 shadow-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-[#FF9900] rounded-full blur-xl opacity-40 group-hover:opacity-100 transition duration-1000"></div>
          <div className="relative bg-indigo-600 text-white p-6 rounded-full shadow-2xl hover:scale-110 hover:rotate-6 transition-all duration-500 flex items-center justify-center">
            <MessageCircle className="w-8 h-8" />
          </div>
        </button>
      )}
    </div>
  );
};

export default AIAssistant;
