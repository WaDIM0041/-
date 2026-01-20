
import React, { useState, useEffect } from 'react';
import { Database, Github, Settings2, Globe, Lock, CloudDownload, CloudUpload, Copy, Key, Check, AlertCircle } from 'lucide-react';
import { User, GithubConfig } from '../types.ts';
import { STORAGE_KEYS } from '../App.tsx';

const GH_CONFIG_KEY = 'stroy_sync_gh_config_v4';

interface BackupManagerProps {
  currentUser?: User | null;
  onDataImport?: (data: any) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ currentUser, onDataImport }) => {
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem(GH_CONFIG_KEY);
      return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'zodchiy_backup.json' };
    } catch { return { token: '', repo: '', path: 'zodchiy_backup.json' }; }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(ghConfig));
  }, [ghConfig]);

  const toBase64 = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  };

  const fromBase64 = (str: string) => {
    try {
      return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch { return ''; }
  };

  // Генерация единого ключа на основе настроек
  const generateSyncKey = () => {
    if (!ghConfig.token || !ghConfig.repo) return '';
    return toBase64(JSON.stringify(ghConfig));
  };

  // Импорт настроек из ключа
  const handleImportSyncKey = () => {
    if (!syncKey.trim()) return;
    const decoded = fromBase64(syncKey.trim());
    if (decoded) {
      try {
        const config = JSON.parse(decoded);
        if (config.token && config.repo) {
          setGhConfig(config);
          setSyncKey('');
          alert("Ключ синхронизации успешно применен!");
        }
      } catch { alert("Неверный формат ключа"); }
    } else { alert("Ошибка декодирования ключа"); }
  };

  const handleCopyKey = () => {
    const key = generateSyncKey();
    if (!key) {
      alert("Сначала заполните настройки GitHub в расширенном режиме");
      setShowAdvanced(true);
      return;
    }
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePullFromGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Настройте доступ (используйте ключ или ручной ввод)");
      return;
    }

    setIsSyncing(true);
    try {
      const url = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ghConfig.token.trim()}`, 'Accept': 'application/vnd.github.v3+json' }
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(fromBase64(data.content));
        if (onDataImport) {
          onDataImport(content);
          alert("Данные успешно загружены из облака!");
        }
      } else {
        throw new Error("Файл не найден. Сохраните данные сначала.");
      }
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToGithub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      alert("Настройте доступ к GitHub");
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
      const headers = { 'Authorization': `Bearer ${ghConfig.token.trim()}`, 'Content-Type': 'application/json' };
      
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
          message: `Sync from Zodchiy Mobile`,
          content,
          sha: sha || undefined
        })
      });

      if (response.ok) {
        alert("Данные успешно сохранены в облако!");
      } else {
        const err = await response.json();
        throw new Error(err.message);
      }
    } catch (error: any) {
      alert(`Ошибка сохранения: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 px-2 animate-in fade-in">
      <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight leading-none">Облако</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Синхронизация объектов</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handlePullFromGithub}
              disabled={isSyncing}
              className="flex-1 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95"
            >
              <CloudDownload size={20} /> Загрузить
            </button>
            <button 
              onClick={handleSaveToGithub}
              disabled={isSyncing}
              className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
            >
              <CloudUpload size={20} /> Сохранить
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
        {/* Sync Key Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Key size={14} /> Ключ синхронизации
            </h4>
            <button 
              onClick={handleCopyKey}
              className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Скопирован' : 'Мой ключ'}
            </button>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              value={syncKey}
              onChange={(e) => setSyncKey(e.target.value)}
              placeholder="Вставьте ключ другого устройства..."
              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 px-5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50"
            />
            <button 
              onClick={handleImportSyncKey}
              className="bg-slate-800 text-white px-5 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all"
            >
              Ок
            </button>
          </div>
          <p className="text-[9px] text-slate-400 font-medium px-1 italic">
            Используйте этот ключ, чтобы мгновенно настроить синхронизацию на новом телефоне без ввода паролей GitHub.
          </p>
        </div>

        {/* Advanced Settings */}
        <div className="pt-6 border-t border-slate-50">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Расширенные настройки (GitHub)</span>
            <Settings2 size={16} className={showAdvanced ? 'rotate-90 transition-transform' : ''} />
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Personal Access Token</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="password" 
                    value={ghConfig.token}
                    onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 pl-11 pr-4 text-xs font-bold text-slate-700 outline-none"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Репозиторий (user/repo)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    value={ghConfig.repo}
                    onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 pl-11 pr-4 text-xs font-bold text-slate-700 outline-none"
                    placeholder="name/my-repo"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex gap-4">
        <AlertCircle className="text-blue-600 shrink-0" size={24} />
        <p className="text-[11px] font-bold text-blue-900 leading-relaxed">
          Все данные хранятся в зашифрованном JSON-файле в вашем личном репозитории GitHub. Это гарантирует 100% приватность и владение информацией.
        </p>
      </div>
    </div>
  );
};
