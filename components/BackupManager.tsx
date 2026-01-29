
import React, { useState, useEffect } from 'react';
import { 
  Database, Github, Globe, Server, Link as LinkIcon, ClipboardCheck, Terminal
} from 'lucide-react';
import { User, SyncConfig, AppSnapshot, APP_VERSION, UserRole, InvitePayload } from '../types.ts';

interface BackupManagerProps {
  currentUser?: User | null;
  currentDb: AppSnapshot;
  onDataImport: (data: AppSnapshot) => void;
  onSyncConfigUpdate: (cfg: SyncConfig) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, currentDb, onDataImport, onSyncConfigUpdate }) => {
  const [config, setConfig] = useState<SyncConfig>({ mode: 'local' });
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('zodchiy_cfg_v2.2');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const saveConfig = (newCfg: SyncConfig) => {
    setConfig(newCfg);
    onSyncConfigUpdate(newCfg);
    localStorage.setItem('zodchiy_cfg_v2.2', JSON.stringify(newCfg));
  };

  const generateInviteLink = () => {
    const payload: InvitePayload = {
      mode: config.mode,
      token: config.github?.token,
      repo: config.github?.repo,
      path: config.github?.path,
      apiUrl: config.apiUrl,
      role: UserRole.FOREMAN,
      username: currentUser?.username || 'Admin'
    };
    const code = btoa(JSON.stringify(payload));
    const fullLink = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    navigator.clipboard.writeText(fullLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16 text-left">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
            <Globe size={32} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Синхронизация</h2>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-[11px] font-black uppercase text-slate-800 px-2 flex items-center gap-2"><Server size={14} /> Тип хранилища</h3>
        
        <div className="grid grid-cols-1 gap-2">
          {['local', 'github'].map((m) => (
            <button 
              key={m}
              onClick={() => saveConfig({ mode: m as any, github: config.github || { token: '', repo: '', path: 'db.json' } })}
              className={`p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${config.mode === m ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}
            >
              <div className={`p-3 rounded-xl ${config.mode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {m === 'local' ? <Database size={20} /> : <Github size={20} />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase block text-slate-900">{m === 'local' ? 'Локальное' : 'GitHub Cloud'}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">{m === 'local' ? 'В этом браузере' : 'Для работы всей команды'}</span>
              </div>
            </button>
          ))}
        </div>

        {config.mode === 'github' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">GitHub Token (ghp_...)</label>
              <input 
                type="password" 
                value={config.github?.token}
                onChange={e => saveConfig({ ...config, github: { ...config.github!, token: e.target.value } })}
                className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" 
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Репозиторий (user/repo)</label>
              <input 
                type="text" 
                value={config.github?.repo}
                onChange={e => saveConfig({ ...config, github: { ...config.github!, repo: e.target.value } })}
                className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none" 
              />
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={generateInviteLink}
        disabled={config.mode === 'local'}
        className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
          linkCopied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white shadow-slate-200'
        } disabled:opacity-50`}
      >
        {linkCopied ? <ClipboardCheck size={20} /> : <LinkIcon size={20} />}
        Создать ссылку для входа
      </button>

      <div className="pt-8 text-center text-[8px] font-black text-slate-300 uppercase">ЗОДЧИЙ CORE • v{APP_VERSION}</div>
    </div>
  );
};
