import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, Eye, Building2, ChevronRight, Lock, User as UserIcon, CheckCircle2, AlertTriangle, ArrowLeft, Settings, Database, Github, Save, CloudOff } from 'lucide-react';
import { User, UserRole, ROLE_LABELS, APP_VERSION } from '../types.ts';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  onApplyInvite: (code: string) => boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, onApplyInvite }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  // Упрощаем: по умолчанию разрешаем вход, даже если GitHub не настроен
  const [isConfigured, setIsConfigured] = useState(true);
  const [hasRealCloud, setHasRealCloud] = useState(() => !!localStorage.getItem('zodchiy_cloud_config_stable_v1'));
  
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [setupData, setSetupData] = useState({ token: '', repo: '', path: 'db.json' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      const success = onApplyInvite(invite);
      if (success) {
        setHasRealCloud(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [onApplyInvite]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    if (password === (selectedUser.password || '123')) {
      onLogin(selectedUser);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleInitialSetup = () => {
    if (!setupData.token || !setupData.repo) {
      alert("Заполните токен и репозиторий");
      return;
    }
    const config = { token: setupData.token, repo: setupData.repo, path: setupData.path };
    localStorage.setItem('zodchiy_cloud_config_stable_v1', JSON.stringify(config));
    setHasRealCloud(true);
    setShowManualSetup(false);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={20} />;
      case UserRole.MANAGER: return <Activity size={20} />;
      case UserRole.FOREMAN: return <Users size={20} />;
      case UserRole.SUPERVISOR: return <Eye size={20} />;
    }
  };

  const getRoleTheme = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-amber-500 text-white';
      case UserRole.MANAGER: return 'bg-indigo-500 text-white';
      case UserRole.FOREMAN: return 'bg-blue-500 text-white';
      case UserRole.SUPERVISOR: return 'bg-emerald-500 text-white';
    }
  };

  // ЭКРАН ВЫБОРА ПРОФИЛЯ
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6">
      {!hasRealCloud && !selectedUser && !showManualSetup && (
        <button 
          onClick={() => setShowManualSetup(true)}
          className="fixed top-6 right-6 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 flex items-center gap-2 hover:text-blue-600 transition-all z-50 group"
        >
          <Settings size={18} className="group-hover:rotate-90 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Настройка облака</span>
        </button>
      )}

      {showManualSetup ? (
        <div className="w-full max-w-sm animate-in slide-in-from-bottom-8 duration-500 bg-white p-8 rounded-[3rem] text-left shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Github size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Облако</h2>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Ручная настройка</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">GitHub Token</label>
              <input 
                type="password" 
                value={setupData.token}
                onChange={e => setSetupData({...setupData, token: e.target.value})}
                placeholder="ghp_..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Repository (user/repo)</label>
              <input 
                type="text" 
                value={setupData.repo}
                onChange={e => setSetupData({...setupData, repo: e.target.value})}
                placeholder="my-name/my-construction-db"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
               <button 
                onClick={() => setShowManualSetup(false)}
                className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Назад
              </button>
              <button 
                onClick={handleInitialSetup}
                className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
              >
                <Save size={16} /> Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex bg-white p-4 rounded-3xl shadow-xl border border-slate-100 mb-6 animate-in zoom-in duration-700">
              <Building2 size={42} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              ЗОДЧИЙ <span className="text-blue-600">CORE</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              {!hasRealCloud && <CloudOff size={10} className="text-amber-500" />}
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${!hasRealCloud ? 'text-amber-500' : 'text-slate-400'}`}>
                {!hasRealCloud ? 'Локальный режим (без облака)' : 'Облачный режим активен'}
              </p>
            </div>
          </div>

          {!selectedUser ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-3">
                {users.map((user) => (
                  <button 
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="group flex items-center gap-4 p-4 bg-white rounded-[1.8rem] border border-slate-100 hover:border-blue-500 hover:shadow-lg transition-all active:scale-[0.98] text-left shadow-sm"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${getRoleTheme(user.role)} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 shrink-0`}>
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-slate-800 leading-none mb-1.5 uppercase tracking-tight">{user.username}</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{ROLE_LABELS[user.role]}</p>
                    </div>
                    <ChevronRight className="text-slate-200 group-hover:text-blue-500" size={20} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center relative">
              <button 
                onClick={() => { setSelectedUser(null); setPassword(''); }}
                className="absolute top-6 left-6 p-2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className={`w-20 h-20 rounded-[2rem] ${getRoleTheme(selectedUser.role)} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                {getRoleIcon(selectedUser.role)}
              </div>
              
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-1">{selectedUser.username}</h3>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-8">{ROLE_LABELS[selectedUser.role]}</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    className={`w-full bg-slate-50 border ${error ? 'border-rose-500 bg-rose-50' : 'border-slate-100'} rounded-2xl px-14 py-5 text-center text-lg font-black tracking-[0.5em] outline-none transition-all focus:border-blue-500 focus:bg-white`}
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  Войти в систему
                  <ChevronRight size={18} />
                </button>
              </form>

              {error && (
                <p className="text-[9px] font-black text-rose-500 mt-4 uppercase tracking-widest animate-in slide-in-from-top-2">Неверный пароль</p>
              )}
            </div>
          )}

          <div className="pt-8 text-center border-t border-slate-200">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Zodchiy Core • v{APP_VERSION}</p>
          </div>
        </div>
      )}
    </div>
  );
};