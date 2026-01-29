
import React, { useState } from 'react';
import { Lock, User as UserIcon, Building2, ChevronRight } from 'lucide-react';
import { User, UserRole } from '../types.ts';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    // Простейшая проверка для теста (Админ/123 или Прораб/123)
    if (username.toLowerCase() === 'админ' && password === '123') {
      onLogin({ id: 1, username: 'Админ', role: UserRole.ADMIN });
    } else {
      onLogin({ id: Date.now(), username: username || 'Гость', role: UserRole.FOREMAN });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-flex p-4 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-500/20">
            <Building2 size={40} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Зодчий <span className="text-blue-500">Core</span></h1>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Управление строительством</p>
        </div>

        <form onSubmit={handleFinish} className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
          <div className="space-y-4 text-left">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Имя пользователя</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Админ"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="123"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Войти в систему <ChevronRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
