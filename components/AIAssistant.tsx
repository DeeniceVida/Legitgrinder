
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
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
                <div className={`max-w-[85%] rounded-[1.8rem] p-5 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-indigo-50 shadow-indigo-50/50'
                }`}>
                  {m.content}
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
