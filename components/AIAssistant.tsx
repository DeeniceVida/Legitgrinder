
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { askAssistant } from '../services/gemini';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm the LegitGrinder AI. Ready to help you bring those global goods to Kenya. What's on your mind?" }
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
    setMessages(prev => [...prev, { role: 'assistant', content: reply || 'Sorry, I encountered an error.' }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[60]">
      {isOpen ? (
        <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-80 sm:w-[400px] flex flex-col h-[600px] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="bg-[#0a0a0a] p-6 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                <Bot className="w-5 h-5 text-[#FF9900]" />
              </div>
              <div>
                <span className="font-bold block text-sm">LegitAssistant</span>
                <span className="text-[10px] opacity-80 flex items-center">
                  <span className="w-1.5 h-1.5 bg-[#FF9900] rounded-full mr-1 animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] rounded-[1.5rem] p-4 text-sm leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-[#0a0a0a] text-white rounded-br-none shadow-lg' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-100 shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white border border-gray-100 rounded-[1.5rem] rounded-bl-none p-4 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-[#FF9900] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#FF9900] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-[#FF9900] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white border-t border-gray-100 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about shipping, fees, etc..."
                className="w-full bg-gray-100 border-none rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30 focus:bg-white transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 bg-[#FF9900] text-white p-2.5 rounded-xl hover:bg-black transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-[#FF9900]/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center">
              <Sparkles className="w-3 h-3 mr-1 text-[#FF9900]" />
              LegitGrinder AI Engine
            </p>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="group relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-[#FF9900] to-[#e68a00] rounded-full blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#FF9900] text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 active:scale-90 flex items-center justify-center">
            <MessageCircle className="w-7 h-7" />
          </div>
        </button>
      )}
    </div>
  );
};

export default AIAssistant;
