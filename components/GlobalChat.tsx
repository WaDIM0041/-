
import React, { useState, useRef, useEffect } from 'react';
import { GlobalChatMessage, User, UserRole } from '../types.ts';
import { SendHorizontal, MessageSquare, Shield, Activity, Users, Eye } from 'lucide-react';

interface GlobalChatProps {
  messages: GlobalChatMessage[];
  currentUser: User;
  currentRole: UserRole;
  onSendMessage: (text: string) => void;
}

export const GlobalChat: React.FC<GlobalChatProps> = ({ messages, currentUser, currentRole, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={10} />;
      case UserRole.MANAGER: return <Activity size={10} />;
      case UserRole.FOREMAN: return <Users size={10} />;
      case UserRole.SUPERVISOR: return <Eye size={10} />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'text-amber-600 bg-amber-50';
      case UserRole.MANAGER: return 'text-indigo-600 bg-indigo-50';
      case UserRole.FOREMAN: return 'text-blue-600 bg-blue-50';
      case UserRole.SUPERVISOR: return 'text-emerald-600 bg-emerald-50';
    }
  };

  return (
    <div className="flex flex-col h-[75vh] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-blue-600" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Общий чат команды</h3>
        </div>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{messages.length} сообщений</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 gap-2">
            <MessageSquare size={32} />
            <p className="text-[10px] font-black uppercase">История сообщений пуста</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 ${msg.userId === currentUser.id ? 'bg-blue-600 text-slate-100 shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-800 border border-slate-100'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 ${msg.userId === currentUser.id ? 'text-blue-100 bg-white/10' : getRoleColor(msg.role)}`}>
                    {getRoleIcon(msg.role)} {msg.username}
                  </span>
                  <span className={`text-[7px] font-bold ${msg.userId === currentUser.id ? 'text-slate-100/60' : 'text-slate-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-bold leading-relaxed text-left">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-50 flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Сообщение всем..." 
          className="flex-1 bg-slate-50 px-4 py-3 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none border border-slate-100 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
        />
        <button onClick={handleSend} className="bg-blue-600 text-slate-100 p-3 rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all">
          <SendHorizontal size={20} />
        </button>
      </div>
    </div>
  );
};
