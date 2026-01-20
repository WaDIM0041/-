
import React, { useState, useRef, useEffect } from 'react';
import { Comment, User, UserRole } from '../types.ts';
import { SendHorizontal, MessageSquare, Shield, Activity, Users, Eye } from 'lucide-react';

interface ProjectChatProps {
  messages: Comment[];
  currentUser: User;
  currentRole: UserRole;
  onSendMessage: (text: string) => void;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ messages, currentUser, currentRole, onSendMessage }) => {
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
      case UserRole.ADMIN: return <Shield size={14} />;
      case UserRole.MANAGER: return <Activity size={14} />;
      case UserRole.FOREMAN: return <Users size={14} />;
      case UserRole.SUPERVISOR: return <Eye size={14} />;
      default: return null;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'text-amber-600 bg-amber-50';
      case UserRole.MANAGER: return 'text-indigo-600 bg-indigo-50';
      case UserRole.FOREMAN: return 'text-blue-600 bg-blue-50';
      case UserRole.SUPERVISOR: return 'text-emerald-600 bg-emerald-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="flex flex-col max-h-[500px] bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[180px] scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full py-12 flex flex-col items-center justify-center text-slate-300 opacity-50 gap-3">
            <MessageSquare size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest">Нет комментариев к объекту</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.author === currentUser.username ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] rounded-[1.5rem] p-4 shadow-sm ${msg.author === currentUser.username ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1.5 ${msg.author === currentUser.username ? 'text-blue-100 bg-white/10' : getRoleColor(msg.role)}`}>
                    {getRoleIcon(msg.role)} {msg.author}
                  </span>
                  <span className={`text-[7px] font-bold ${msg.author === currentUser.username ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-bold leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Напишите комментарий..." 
          className="flex-1 bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-700 outline-none border border-slate-100 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
        />
        <button 
          onClick={handleSend} 
          className="bg-blue-600 text-white p-4 rounded-2xl active:scale-90 transition-all shadow-lg shadow-blue-100"
        >
          <SendHorizontal size={24} />
        </button>
      </div>
    </div>
  );
};
