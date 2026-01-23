
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, APP_VERSION, AppNotification, AppSnapshot, FileCategory 
} from './types.ts';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { ProjectForm } from './components/ProjectForm.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { GlobalChat } from './components/GlobalChat.tsx';
import { Logo } from './components/Logo.tsx';
import { 
  LayoutGrid, LogOut, RefreshCw, Bell, Cloud, Wifi, 
  MessageSquare, Settings, Plus, ShieldCheck, Building2,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react';

export const STORAGE_KEYS = {
  AUTH_USER: 'zodchiy_auth_session_stable_v1',
  GH_CONFIG: 'zodchiy_cloud_config_stable_v1'
};

const DB_NAME = 'ZodchiyDB';
const STORE_NAME = 'appState';
const DB_VERSION = 3;

const DEFAULT_STATE: AppSnapshot = {
  version: APP_VERSION,
  timestamp: new Date().toISOString(),
  projects: [
    {
      id: 101,
      name: "ЖК 'Скандинавия' - Корпус 4",
      description: "Строительство монолитного 17-этажного жилого дома. Текущий этап: возведение фундамента и цокольного этажа.",
      clientFullName: "ООО 'СеверИнвест'",
      city: "Москва",
      street: "ул. Строителей, д. 25",
      phone: "+7 (900) 123-45-67",
      telegram: "@scandi_build",
      address: "г. Москва, ул. Строителей, д. 25",
      geoLocation: { lat: 55.7558, lon: 37.6173 },
      fileLinks: [],
      progress: 15,
      status: ProjectStatus.IN_PROGRESS,
      comments: [
        { id: 1, author: 'Менеджер', role: UserRole.MANAGER, text: 'Прораб, обрати внимание на график поставок бетона на следующую неделю.', createdAt: new Date().toISOString() }
      ],
      updatedAt: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: 201,
      projectId: 101,
      title: "Монтаж опалубки фундамента",
      description: "Установка щитов опалубки согласно чертежу КЖ-1. Проверка геометрии и надежности креплений перед армированием.",
      status: TaskStatus.IN_PROGRESS,
      evidenceUrls: [],
      evidenceCount: 0,
      comments: [
        { id: 10, author: 'Прораб 1', role: UserRole.FOREMAN, text: 'Щиты завезли, приступаем к установке по осям А-В.', createdAt: new Date().toISOString() }
      ],
      updatedAt: new Date().toISOString()
    }
  ],
  notifications: [],
  chatMessages: [],
  users: [
    { id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' },
    { id: 2, username: 'Менеджер', role: UserRole.MANAGER, password: '123' },
    { id: 3, username: 'Прораб 1', role: UserRole.FOREMAN, password: '123' },
    { id: 4, username: 'Технадзор', role: UserRole.SUPERVISOR, password: '123' },
  ]
};

// --- ROBUST UTILS ---
const encodeUnicode = (str: string) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
    String.fromCharCode(parseInt(p1, 16))
  ));
};

const decodeUnicode = (str: string) => {
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
};

const idb = {
  db: null as IDBDatabase | null,
  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => { this.db = request.result; resolve(request.result); };
      request.onerror = () => reject(request.error);
    });
  },
  async get(key: string): Promise<any> {
    const db = await this.open();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
    });
  },
  async set(key: string, value: any): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
  async clear(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
    });
  }
};

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve((reader.result as string).split(',')[1]);
  reader.onerror = reject;
});

// --- CLOUD ENGINE ---
const cloud = {
  isSyncing: false,
  getConfig: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
    return saved ? JSON.parse(saved) : null;
  },

  uploadMedia: async (file: File): Promise<string> => {
    const config = cloud.getConfig();
    if (!config?.token) throw new Error("Cloud not configured");
    
    const base64 = await fileToBase64(file);
    const fileName = `media/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const url = `https://api.github.com/repos/${config.repo}/contents/${fileName}`;
    
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Upload media: ${file.name}`, content: base64 })
    });
    
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.content.download_url;
  },

  sync: async (local: AppSnapshot): Promise<AppSnapshot | null> => {
    if (cloud.isSyncing) return null;
    const config = cloud.getConfig();
    if (!config?.token) return null;

    cloud.isSyncing = true;
    const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}`;
    const headers = { 'Authorization': `Bearer ${config.token}`, 'Accept': 'application/vnd.github.v3+json' };

    try {
      const getRes = await fetch(url, { headers, cache: 'no-store' });
      let cloudDb: AppSnapshot | null = null;
      let sha = "";

      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        cloudDb = JSON.parse(decodeUnicode(data.content));
      }

      let final = local;
      if (cloudDb) {
        const merge = (l: any[], c: any[]) => {
          const map = new Map();
          [...l, ...c].forEach(i => {
            const ex = map.get(i.id);
            if (!ex || new Date(i.updatedAt || 0) > new Date(ex.updatedAt || 0)) map.set(i.id, i);
          });
          return Array.from(map.values());
        };

        final = {
          ...local,
          users: merge(local.users || [], cloudDb.users || []),
          projects: merge(local.projects || [], cloudDb.projects || []),
          tasks: merge(local.tasks || [], cloudDb.tasks || []),
          chatMessages: merge(local.chatMessages || [], cloudDb.chatMessages || []),
          timestamp: new Date().toISOString(),
          lastSync: new Date().toISOString()
        };
      } else {
        // Если файла в облаке еще нет, создаем его на базе локального
        final = { ...local, lastSync: new Date().toISOString() };
      }

      const content = encodeUnicode(JSON.stringify(final));
      await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `AutoSync ${new Date().toISOString()}`, 
          content, 
          sha: sha || undefined 
        })
      });

      return final;
    } catch (e) {
      console.error("Zodchiy: Sync error", e);
      return null;
    } finally {
      cloud.isSyncing = false;
    }
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [db, setDb] = useState<AppSnapshot | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local_only'>('synced');
  const [isLoading, setIsLoading] = useState(true);
  
  const syncTimerRef = useRef<any>(null);

  // Initial Load
  useEffect(() => {
    idb.get('state').then(async (state) => {
      if (!state || !state.users || state.users.length === 0) {
        await idb.set('state', DEFAULT_STATE);
        setDb(DEFAULT_STATE);
      } else {
        setDb(state);
      }
      setIsLoading(false);
    });

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const runSync = useCallback(async (current: AppSnapshot) => {
    const config = cloud.getConfig();
    if (!config?.token) {
      setSyncStatus('local_only');
      return;
    }

    setSyncStatus('syncing');
    const result = await cloud.sync(current);
    if (result) {
      setDb(result);
      await idb.set('state', result);
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
  }, []);

  // Auto-sync interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (db && !cloud.isSyncing) runSync(db);
    }, 60000);
    return () => clearInterval(interval);
  }, [db, runSync]);

  const handleUpdateDB = useCallback((updater: (prev: AppSnapshot) => AppSnapshot) => {
    setDb(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      next.timestamp = new Date().toISOString();
      
      // Мгновенное локальное сохранение
      idb.set('state', next);
      setSyncStatus('local_only'); // Помечаем, что есть локальные изменения, не ушедшие в облако

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => runSync(next), 2000);

      return next;
    });
  }, [runSync]);

  const handleResetApp = async () => {
    if (window.confirm("Это сбросит все локальные данные. Вы уверены?")) {
      await idb.clear();
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      window.location.reload();
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'admin' | 'settings'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);

  const handleGoHome = () => {
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setIsAddingProject(false);
    setIsEditingProject(false);
    setActiveTab('dashboard');
  };

  const uploadProjectFile = async (pid: number, file: File, cat: FileCategory) => {
    setSyncStatus('syncing');
    try {
      const url = await cloud.uploadMedia(file);
      handleUpdateDB(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === pid ? {
          ...p, updatedAt: new Date().toISOString(),
          fileLinks: [...(p.fileLinks || []), { 
            id: Date.now().toString(), 
            name: file.name, 
            url, 
            category: cat, 
            createdAt: new Date().toISOString() 
          }]
        } : p)
      }));
    } catch (e) { 
      setSyncStatus('error'); 
      console.error("Media upload failed", e);
    }
  };

  if (isLoading || !db) return (
    <div className="flex-1 h-screen flex flex-col items-center justify-center bg-[#0f172a]">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-6 animate-pulse">Инициализация...</p>
    </div>
  );

  const selectedProject = db.projects.find(p => p.id === selectedProjectId);
  const selectedTask = db.tasks.find(t => t.id === selectedTaskId);

  if (!currentUser) return (
    <LoginPage 
      users={db.users || []} 
      onLogin={(u) => { 
        setCurrentUser(u); 
        setActiveRole(u.role); 
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(u)); 
      }} 
      onApplyInvite={(code) => {
        try {
          const decoded = JSON.parse(decodeUnicode(code));
          localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify({
            token: decoded.token,
            repo: decoded.repo,
            path: decoded.path
          }));
          window.location.reload();
          return true;
        } catch { return false; }
      }}
      onReset={handleResetApp}
    />
  );

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-500 ${activeRole === UserRole.ADMIN ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      <header className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-md transition-all ${activeRole === UserRole.ADMIN ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <button 
          onClick={handleGoHome}
          className="flex items-center gap-3 active:scale-95 transition-transform cursor-pointer group"
        >
          <Logo size={32} isMaster={activeRole === UserRole.ADMIN} />
          <div className="text-left">
            <h1 className={`text-xs font-black uppercase tracking-widest leading-none transition-colors group-hover:text-blue-500 ${activeRole === UserRole.ADMIN ? 'text-white' : 'text-slate-900'}`}>Зодчий</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-blue-600 text-white">{ROLE_LABELS[activeRole]}</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => db && runSync(db)}
            disabled={syncStatus === 'syncing'}
            className={`flex flex-col items-end gap-1 px-3 py-1.5 rounded-xl border transition-all active:scale-90 ${
              syncStatus === 'syncing' ? 'bg-blue-50 border-blue-200' : 
              syncStatus === 'error' ? 'bg-rose-50 border-rose-200' : 
              syncStatus === 'local_only' ? 'bg-amber-50 border-amber-200 animate-pulse' :
              'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' ? <RefreshCw size={10} className="text-blue-500 animate-spin" /> : 
               syncStatus === 'synced' ? <CheckCircle2 size={10} className="text-emerald-500" /> : 
               syncStatus === 'local_only' ? <Cloud size={10} className="text-amber-500" /> :
               <AlertCircle size={10} className="text-rose-500" />}
              <span className={`text-[8px] font-black uppercase tracking-tighter ${
                syncStatus === 'syncing' ? 'text-blue-600' : 
                syncStatus === 'synced' ? 'text-emerald-600' : 
                syncStatus === 'local_only' ? 'text-amber-600' :
                'text-rose-600'
              }`}>
                {syncStatus === 'syncing' ? 'Обмен...' : 
                 syncStatus === 'synced' ? 'В Облаке' : 
                 syncStatus === 'local_only' ? 'Локально' :
                 'Ошибка'}
              </span>
            </div>
            {db.lastSync && (
              <div className="flex items-center gap-1 opacity-60">
                <Clock size={7} className="text-slate-400" />
                <span className="text-[6px] font-bold text-slate-400 uppercase">
                  {new Date(db.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </button>
          
          <button 
            onClick={() => { localStorage.removeItem(STORAGE_KEYS.AUTH_USER); setCurrentUser(null); }} 
            className="p-2.5 bg-rose-50 text-rose-500 rounded-xl active:scale-90 transition-transform"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {selectedTaskId && selectedTask ? (
          <TaskDetails 
            task={selectedTask} role={activeRole} isAdmin={activeRole === UserRole.ADMIN} onClose={() => setSelectedTaskId(null)}
            onStatusChange={(tid, st, file, comm) => {
              if (file) {
                cloud.uploadMedia(file).then(url => {
                  handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, status: st, evidenceUrls: [...t.evidenceUrls, url], evidenceCount: t.evidenceCount+1, supervisorComment: comm || t.supervisorComment, updatedAt: new Date().toISOString() } : t) }));
                });
              } else {
                handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, status: st, supervisorComment: comm || t.supervisorComment, updatedAt: new Date().toISOString() } : t) }));
              }
            }}
            onAddComment={(tid, txt) => handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, updatedAt: new Date().toISOString(), comments: [...(t.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : t) }))}
            onAddEvidence={(tid, file) => cloud.uploadMedia(file).then(url => handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, evidenceUrls: [...t.evidenceUrls, url], evidenceCount: t.evidenceCount+1, updatedAt: new Date().toISOString() } : t) })))}
            onUpdateTask={(ut) => handleUpdateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === ut.id ? { ...ut, updatedAt: new Date().toISOString() } : t) }))}
          />
        ) : selectedProjectId && selectedProject ? (
          isEditingProject ? (
            <ProjectForm 
              project={selectedProject} 
              onSave={(p) => {
                handleUpdateDB(prev => ({ ...prev, projects: prev.projects.map(item => item.id === p.id ? { ...p, updatedAt: new Date().toISOString() } : item) }));
                setIsEditingProject(false);
              }} 
              onCancel={() => setIsEditingProject(false)} 
            />
          ) : (
            <ProjectView 
              project={selectedProject} tasks={db.tasks.filter(t => t.projectId === selectedProjectId)} currentUser={currentUser} activeRole={activeRole}
              onBack={() => setSelectedProjectId(null)}
              onEdit={() => setIsEditingProject(true)}
              onAddTask={() => {
                const nid = Date.now();
                handleUpdateDB(prev => ({ ...prev, tasks: [{ id: nid, projectId: selectedProjectId, title: 'Новая задача', description: 'Описание работ...', status: TaskStatus.TODO, evidenceUrls: [], evidenceCount: 0, comments: [], updatedAt: new Date().toISOString() }, ...prev.tasks] }));
                setSelectedTaskId(nid);
              }}
              onSelectTask={setSelectedTaskId}
              onSendMessage={(txt) => handleUpdateDB(prev => ({ ...prev, projects: prev.projects.map(p => p.id === selectedProjectId ? { ...p, updatedAt: new Date().toISOString(), comments: [...(p.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : p) }))}
              onAddFile={uploadProjectFile}
            />
          )
        ) : isAddingProject ? (
          <ProjectForm project={{} as Project} onSave={(p) => { 
            const nid = Date.now();
            handleUpdateDB(prev => ({ ...prev, projects: [{ ...p, id: nid, status: ProjectStatus.NEW, fileLinks: [], progress: 0, comments: [], updatedAt: new Date().toISOString() }, ...prev.projects] }));
            setIsAddingProject(false); setSelectedProjectId(nid);
          }} onCancel={() => setIsAddingProject(false)} />
        ) : (
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Объекты</h2>
                  {activeRole === UserRole.ADMIN && <button onClick={() => setIsAddingProject(true)} className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl active:scale-95 transition-transform"><Plus size={20} /></button>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {db.projects.length === 0 ? (
                    <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in duration-500">
                      <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
                        <Building2 size={32} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Объектов пока нет</p>
                      {activeRole === UserRole.ADMIN && (
                        <button onClick={() => setIsAddingProject(true)} className="text-blue-600 text-[10px] font-black uppercase tracking-widest underline underline-offset-4">Создать первый</button>
                      )}
                    </div>
                  ) : db.projects.map(p => (
                    <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]">
                      <div className="flex gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Building2 size={24} /></div>
                        <div><h3 className="text-base font-black text-slate-800 uppercase leading-tight">{p.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{p.address}</p></div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-[10px] font-black text-blue-600 uppercase">Прогресс: {p.progress}%</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase">Медиа: {p.fileLinks?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {activeTab === 'chat' && <GlobalChat messages={db.chatMessages || []} currentUser={currentUser} currentRole={activeRole} onSendMessage={(txt) => handleUpdateDB(prev => ({...prev, chatMessages: [...(prev.chatMessages || []), {id: Date.now(), userId: currentUser.id, username: currentUser.username, role: activeRole, text: txt, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString()}]}))} />}
            {activeTab === 'admin' && activeRole === UserRole.ADMIN && <AdminPanel users={db.users} onUpdateUsers={(users) => handleUpdateDB(prev => ({ ...prev, users }))} currentUser={currentUser} activeRole={activeRole} onRoleSwitch={setActiveRole} />}
            {activeTab === 'settings' && <BackupManager currentUser={currentUser} currentDb={db} onDataImport={(data) => { handleUpdateDB(() => data); runSync(data); }} />}
          </div>
        )}
      </main>

      {!selectedProjectId && !selectedTaskId && !isAddingProject && (
        <nav className={`fixed bottom-0 left-0 right-0 p-4 pb-8 border-t flex justify-around backdrop-blur-lg z-50 transition-colors ${activeRole === UserRole.ADMIN ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}><LayoutGrid size={22} /><span className="text-[8px] font-black uppercase">Объекты</span></button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'chat' ? 'text-indigo-500' : 'text-slate-400'}`}><MessageSquare size={22} /><span className="text-[8px] font-black uppercase">Команда</span></button>
          {activeRole === UserRole.ADMIN && <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}><ShieldCheck size={22} /><span className="text-[8px] font-black uppercase">Админ</span></button>}
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${activeTab === 'settings' ? 'text-slate-600' : 'text-slate-400'}`}><Settings size={22} /><span className="text-[8px] font-black uppercase">Облако</span></button>
        </nav>
      )}

      {selectedProjectId && <AIAssistant projectContext={`Проект: ${selectedProject?.name}. Описание: ${selectedProject?.description}.`} />}
    </div>
  );
};

export default App;
