
import React from 'react';
import { Shield, Activity, Users, Eye, Building2, ChevronRight } from 'lucide-react';
import { User, UserRole, ROLE_LABELS } from '../types.ts';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin }) => {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={32} />;
      case UserRole.MANAGER: return <Activity size={32} />;
      case UserRole.FOREMAN: return <Users size={32} />;
      case UserRole.SUPERVISOR: return <Eye size={32} />;
    }
  };

  const getRoleTheme = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'from-amber-500 to-orange-600 shadow-amber-200/50';
      case UserRole.MANAGER: return 'from-indigo-500 to-purple-600 shadow-indigo-200/50';
      case UserRole.FOREMAN: return 'from-blue-500 to-cyan-600 shadow-blue-200/50';
      case UserRole.SUPERVISOR: return 'from-emerald-500 to-teal-600 shadow-emerald-200/50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[140px]"></div>
      </div>

      <div className="w-full max-w-lg z-10 space-y-12">
        <div className="text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex bg-white/10 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl mb-8 border border-white/10">
            <Building2 size={64} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
            ЗОДЧИЙ <span className="text-blue-500">PRO</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mt-3">
            Construction Management
          </p>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          <p className="text-center text-white/40 text-[10px] font-black uppercase tracking-widest mb-6">Выберите ваш профиль для входа</p>
          
          <div className="grid grid-cols-1 gap-3">
            {users.map((user) => (
              <button 
                key={user.id}
                onClick={() => onLogin(user)}
                className="group relative flex items-center gap-5 p-1 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] text-left"
              >
                <div className={`w-20 h-20 rounded-[1.8rem] bg-gradient-to-br ${getRoleTheme(user.role)} flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-105`}>
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white leading-none mb-1">{user.username}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ROLE_LABELS[user.role]}</p>
                </div>
                <div className="pr-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="text-white/20" size={24} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-8 text-center border-t border-white/5">
           <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Zodchiy Standard v7.1 • Secure Access</p>
        </div>
      </div>
    </div>
  );
};
