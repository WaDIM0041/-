
import React, { useState, useEffect } from 'react';
import { Database, Github, Settings2, Globe, Lock, CloudDownload, CloudUpload, Copy, Key, Check, AlertCircle, RefreshCw, ShieldCheck, ShieldAlert, Share2, QrCode, ExternalLink, X, Info, Download, Upload, ArrowRightLeft } from 'lucide-react';
import { User, GithubConfig } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

interface BackupManagerProps {
  currentUser?: User | null;
  onDataImport?: (data: any) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, onDataImport }) => {
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_backup.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_backup.json' }; }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [importKeyText, setImportKeyText] = useState('');

  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
  };

  const fromBase64 = (str: string) => {
    try {
      return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
    } catch (e) {
      console.error("Base64 decode error", e);
      return '';
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const generateConfigToken = () => {
    return btoa(JSON.stringify(ghConfig));
  };

  const handleImportKey = () => {
    try {
      const decoded = atob(importKeyText.trim());
      const config = JSON.parse(decoded);
      if (config.token && config.repo) {
        setGhConfig(config);
        setImportKeyText('');
        alert("Настройки синхронизации приняты! Теперь вы подключены к базе.");
        setSyncStatus('idle');
      } else {
        throw new Error("Неверный формат");
      }
    } catch (e) {
      alert("Ошибка: Некорректный ключ. Попросите администратора скопировать 'Мой ключ' еще раз.");
    }
  };

  const handleShareKey = () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Сначала настройте подключение в разделе 'Настроить базу'");
      setShowAdvanced(true);
      return;
    }
    const token = generateConfigToken();
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert("Ваш ключ скопирован! Отправьте его прорабу.");
  };

  const testConnection = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setSyncStatus('testing');
    try {
      const response = await fetch(`https://api.github.com/repos/${ghConfig.repo}`, {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}` }
      });
      setSyncStatus(response.ok ? 'valid' : 'invalid');
      if (!response.ok) alert("GitHub отклонил доступ. Проверьте токен и имя репозитория.");
    } catch {
      setSyncStatus('invalid');
      alert("Нет связи с сервером GitHub.");
    }
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Синхронизация не настроена");
      return;
    }
    setIsSyncing(true);
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${ghConfig.token.trim()}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(fromBase64(data.content));
        if (onDataImport) onDataImport(content);
        setSyncStatus('valid');
        alert("Данные из облака успешно загружены!");
      } else {
        throw new Error(response.status === 404 ? "Файл базы еще не создан в репозитории. Нажмите сначала 'Сохранить'." : "Ошибка доступа");
      }
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Настройте подключение внизу страницы");
      setShowAdvanced(true);
      return;
    }
    setIsSyncing(true);
    try {
      const appData = {
        projects: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]'),
        tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
        users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
        timestamp: new Date().toISOString(),
      };

      const content = toBase64(JSON.stringify(appData, null, 2));
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = { 
        'Authorization': `Bearer ${ghConfig.token.trim()}`,
        'Content-Type': 'application/json'
      };
      
      let sha = '';
      const getFile = await fetch(url, { headers });
      if (getFile.ok) {
        const fileData = await getFile.json();
        sha = fileData.sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Update via Zodchiy App`,
          content,
          sha: sha || undefined
        })
      });

      if (response.ok) {
        setSyncStatus('valid');
        alert("Данные успешно отправлены в облако!");
      } else {
        const err = await response.json();
        throw new Error(err.message || "Ошибка записи");
      }
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-1 animate-in fade-in">
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-slate-100 shadow-2xl border border-white/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Database size={24} className="text-slate-100" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight leading-none text-slate-100">Облако</h2>
              <span className={`text-[9px] font-black uppercase tracking-widest mt-1 block ${syncStatus === 'valid' ? 'text-emerald-400' : 'text-slate-500'}`}>
                {syncStatus === 'valid' ? 'Синхронизация активна' : 'Ожидание настройки'}
              </span>
            </div>
          </div>
          <button onClick={testConnection} className={`p-3 bg-white/5 rounded-xl text-slate-400 active:scale-90 transition-all ${syncStatus === 'testing' ? 'animate-spin' : ''}`}>
            <RefreshCw size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button 
            onClick={handlePullFromGithub} 
            disabled={isSyncing}
            className="flex flex-col items-center gap-3 bg-white/5 hover:bg-white/10 py-6 rounded-3xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={24} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Загрузить</span>
          </button>
          <button 
            onClick={handleSaveToGithub} 
            disabled={isSyncing}
            className="flex flex-col items-center gap-3 bg-blue-600 hover:bg-blue-700 py-6 rounded-3xl transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-900/20"
          >
            <Upload size={24} className="text-slate-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">Сохранить</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Key size={14} /></div>
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Мой ключ (для команды)</h4>
          </div>
          {ghConfig.token ? (
            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 group">
                <p className="text-[9px] font-mono text-slate-400 flex-1 truncate">{generateConfigToken()}</p>
                <button onClick={handleShareKey} className="p-2.5 bg-white text-blue-600 rounded-xl shadow-sm active:scale-90 transition-all border border-slate-100">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-bold px-1 leading-relaxed italic uppercase tracking-tighter">
                Нажмите "Скопировать" и отправьте этот код прорабу. Он вставит его у себя и сразу получит доступ к вашей базе.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase">Сначала настройте GitHub внизу</p>
            </div>
          )}
        </div>
        <div className="h-px bg-slate-50"></div>
        <div>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><ArrowRightLeft size={14} /></div>
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Вставить ключ другого устройства</h4>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={importKeyText}
                onChange={e => setImportKeyText(e.target.value)}
                placeholder="Вставьте сюда код от начальника..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 placeholder:text-slate-400"
              />
              <button 
                onClick={handleImportKey}
                disabled={!importKeyText.trim()}
                className="bg-slate-900 text-slate-100 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all shadow-lg"
              >
                ОК
              </button>
            </div>
            <p className="text-[9px] text-slate-400 font-bold px-1 leading-relaxed italic uppercase tracking-tighter">
              Если у вас есть ключ от коллеги, вставьте его здесь, чтобы не вводить пароли GitHub вручную.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowQRModal(true)}
          className="w-full flex items-center justify-between p-5 bg-blue-600 text-slate-100 rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <QrCode size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Показать QR-код доступа</span>
          </div>
          <ExternalLink size={18} />
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Github size={14} /> Прямая настройка (GitHub)
          </h4>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[9px] font-black text-blue-600 uppercase transition-colors">
            {showAdvanced ? 'Скрыть' : 'Настроить'}
          </button>
        </div>
        {showAdvanced && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 mb-2">
              <Info size={18} className="text-blue-600 shrink-0" />
              <p className="text-[10px] font-bold text-blue-900 leading-normal">
                Для работы нужен Personal Access Token (Classic) с правами <b>'repo'</b>.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">GitHub Personal Token</label>
              <input 
                type="password" 
                value={ghConfig.token}
                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-4 focus:ring-blue-50"
                placeholder="ghp_..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Репозиторий (username/repo)</label>
              <input 
                type="text" 
                value={ghConfig.repo}
                onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-bold outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-4 focus:ring-blue-50"
                placeholder="ivanov/my-projects"
              />
            </div>
            <button 
              onClick={testConnection}
              className="w-full bg-slate-800 text-slate-100 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
            >
              Проверить подключение
            </button>
          </div>
        )}
      </div>

      {showQRModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center relative shadow-2xl">
            <button onClick={() => setShowQRModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-800 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8">Доступ команде</h3>
            <div className="bg-white p-4 rounded-[2.5rem] border-4 border-slate-50 shadow-inner inline-block mb-8">
               <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(new URL(window.location.origin + '?config=' + generateConfigToken()).toString())}`} 
                alt="QR" 
                className="w-64 h-64 rounded-2xl"
               />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed px-4">
              Попросите коллегу открыть камеру телефона и отсканировать этот код для мгновенной настройки синхронизации.
            </p>
            <button 
              onClick={() => setShowQRModal(false)}
              className="w-full mt-8 bg-slate-900 text-slate-100 font-black py-5 rounded-3xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
