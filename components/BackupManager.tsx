import React, { useState, useEffect } from 'react';
import { Database, Github, Download, Upload, RefreshCw, CheckCircle2, CloudLightning, Zap, ShieldAlert, Key, AlertTriangle, ShieldCheck, Search, Activity, Terminal, Share2, ClipboardCheck, Copy } from 'lucide-react';
import { User, GithubConfig, AppSnapshot, APP_VERSION } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

interface BackupManagerProps {
  currentUser?: User | null;
  currentDb: AppSnapshot;
  onDataImport: (data: AppSnapshot) => void;
}

type DiagnosticStep = {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
};

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, currentDb, onDataImport }) => {
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_db.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_db.json' }; }
  });
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [setupCode, setSetupCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Диагностика
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagSteps, setDiagSteps] = useState<DiagnosticStep[]>([
    { id: 'token', label: 'Проверка Токена', status: 'idle' },
    { id: 'repo', label: 'Поиск Репозитория', status: 'idle' },
    { id: 'write', label: 'Права на запись', status: 'idle' }
  ]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
  };

  const fromBase64 = (str: string) => {
    try {
      return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch (e) {
      console.error("Decoding error", e);
      return str;
    }
  };

  const generateSetupCode = () => {
    const code = toBase64(JSON.stringify(ghConfig));
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applySetupCode = () => {
    try {
      const decoded = JSON.parse(fromBase64(setupCode.trim()));
      if (decoded.token && decoded.repo) {
        setGhConfig(decoded);
        setSetupCode('');
        alert("✅ Настройки успешно импортированы! Теперь вы можете нажать кнопку 'Импорт'.");
      } else {
        alert("❌ Некорректный код подключения.");
      }
    } catch (e) {
      alert("❌ Ошибка при разборе кода.");
    }
  };

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagSteps(prev => prev.map(s => ({ ...s, status: 'idle', message: undefined })));
    setLastError(null);

    const updateStep = (id: string, update: Partial<DiagnosticStep>) => {
      setDiagSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
    };

    try {
      updateStep('token', { status: 'running' });
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }
      });
      if (!userRes.ok) throw { step: 'token', msg: 'Токен невалиден или просрочен (401)' };
      const userData = await userRes.json();
      updateStep('token', { status: 'success', message: `Ок: ${userData.login}` });

      updateStep('repo', { status: 'running' });
      const repoRes = await fetch(`https://api.github.com/repos/${ghConfig.repo}`, {
        headers: { 
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (!repoRes.ok) {
        if (repoRes.status === 404) throw { step: 'repo', msg: 'Репозиторий не найден. Убедитесь в формате "user/repo".' };
        throw { step: 'repo', msg: `Ошибка: ${repoRes.status}` };
      }
      const repoData = await repoRes.json();
      updateStep('repo', { status: 'success', message: `Найдено: ${repoData.private ? 'Приватный' : 'Публичный'}` });

      updateStep('write', { status: 'running' });
      const scopes = userRes.headers.get('x-oauth-scopes');
      if (scopes && !scopes.includes('repo')) {
        updateStep('write', { status: 'error', message: 'Токен без прав "repo".' });
      } else {
        updateStep('write', { status: 'success', message: 'Доступ подтвержден' });
      }

    } catch (e: any) {
      if (e.step) updateStep(e.step, { status: 'error', message: e.msg });
      setLastError(e.msg || 'Ошибка диагностики');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handlePushToGithub = async () => {
    setLastError(null);
    if (!ghConfig.token || !ghConfig.repo.includes('/')) {
      alert("⚠️ Настройте GitHub или вставьте код подключения");
      setShowAdvanced(true);
      return;
    }

    setSyncStatus('loading');
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = {
        'Authorization': `Bearer ${ghConfig.token.trim()}`,
        'Accept': 'application/vnd.github+json'
      };

      let sha = "";
      const getRes = await fetch(url, { headers, cache: 'no-store' });
      if (getRes.ok) {
        const file = await getRes.json();
        sha = file.sha;
      }

      const snapshot: AppSnapshot = { ...currentDb, timestamp: new Date().toISOString(), version: APP_VERSION };
      const content = toBase64(JSON.stringify(snapshot, null, 2));

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Sync v${APP_VERSION}`, content, sha: sha || undefined })
      });

      if (putRes.ok) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        const errorData = await putRes.json();
        throw new Error(errorData.message || 'Ошибка записи');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    }
  };

  const handlePullFromGithub = async () => {
    setLastError(null);
    setSyncStatus('loading');
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        onDataImport(JSON.parse(fromBase64(data.content)));
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        throw new Error(`Ошибка загрузки: ${res.status}`);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16 text-left">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
            <CloudLightning size={32} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Синхронизация Облака</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Версия протокола v1.3.3</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-lg shadow-blue-100 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Share2 size={20} />
          <h3 className="text-[11px] font-black uppercase tracking-widest">Код подключения</h3>
        </div>
        <p className="text-[10px] font-bold opacity-80 leading-relaxed">
          Администратор может скопировать настройки, а остальные сотрудники — вставить код ниже для мгновенного доступа к базе.
        </p>
        
        <div className="flex gap-2">
          <button 
            onClick={generateSetupCode}
            className="flex-1 bg-white/20 hover:bg-white/30 p-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {copied ? <ClipboardCheck size={18} /> : <Copy size={18} />}
            <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'Скопировано' : 'Мой код'}</span>
          </button>
          
          <div className="flex-[2] flex gap-2">
             <input 
               type="text" 
               value={setupCode}
               onChange={e => setSetupCode(e.target.value)}
               placeholder="Вставьте код..."
               className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 text-xs font-bold outline-none placeholder:text-white/40"
             />
             <button 
               onClick={applySetupCode}
               disabled={!setupCode}
               className="bg-white text-blue-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-50"
             >
               Применить
             </button>
          </div>
        </div>
      </div>

      {lastError && (
        <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-4">
          <AlertTriangle className="text-rose-600 shrink-0" size={24} />
          <div>
            <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Ошибка связи</h4>
            <p className="text-xs font-bold text-rose-600 mt-1">{lastError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handlePullFromGithub}
          disabled={syncStatus === 'loading'}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all group disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
            {syncStatus === 'loading' ? <RefreshCw className="animate-spin" size={22} /> : <Download size={22} />}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">Импорт данных</span>
        </button>

        <button 
          onClick={handlePushToGithub}
          disabled={syncStatus === 'loading'}
          className="bg-slate-900 p-6 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all group disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-all">
            {syncStatus === 'loading' ? <RefreshCw className="animate-spin" size={22} /> : <Upload size={22} />}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-white">Экспорт изменений</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Key size={18} /></div>
            <div className="text-left">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Ручные настройки</h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Личные ключи доступа GitHub</p>
            </div>
          </div>
          <RefreshCw size={14} className={`text-slate-300 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Персональный токен</label>
              <input 
                type="password" 
                value={ghConfig.token}
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                placeholder="ghp_..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Репозиторий (user/repo)</label>
              <input 
                type="text" 
                value={ghConfig.repo}
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" 
                placeholder="ivanov/stroy-data"
              />
            </div>
            <button 
              onClick={runDiagnostic}
              disabled={isDiagnosing}
              className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} /> Проверить доступ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};