
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, Construction, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getAITechnicalAdvice } from '../services/aiService.ts';

interface AIAssistantProps {
  projectContext: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ projectContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const aiResponse = await getAITechnicalAdvice(userMsg, projectContext);
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Произошла ошибка при связи с ИИ. Проверьте подключение." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all border-4 border-white/20"
      >
        <Sparkles size={24} className="animate-pulse" />
      </button>

      {/* Assistant Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-[80vh] sm:h-[600px] sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 border border-slate-100">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tighter text-sm">ЗОДЧИЙ AI</h3>
                  <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest">Цифровой технадзор</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-60">
                  <Construction size={48} className="text-blue-200 mb-4" />
                  <p className="text-sm font-bold text-slate-400">Спросите меня о ГОСТах, технологиях или деталях проекта</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["Бетон М350 СНиП", "Нормы армирования", "Охрана труда"].map(q => (
                      <button key={q} onClick={() => setInput(q)} className="text-[9px] font-black uppercase tracking-widest px-3 py-2 bg-white border border-slate-100 rounded-lg text-blue-600">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-white border border-slate-100 text-slate-800 shadow-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Задайте технический вопрос..."
                className="flex-1 bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 border border-slate-100 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
