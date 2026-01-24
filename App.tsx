
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, APP_VERSION, AppSnapshot, GlobalChatMessage, FileCategory 
} from './types.ts';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { ProjectForm } from './components/ProjectForm.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { GlobalChat } from './components/GlobalChat.tsx';
import { Logo } from './components/Logo.tsx';
import { 
  LayoutGrid, LogOut, RefreshCw, MessageSquare, Settings, Plus, ShieldCheck, Building2,
  Cloud, Zap, Loader2, Database, ShieldAlert
} from 'lucide-react';

export const STORAGE_KEYS = {
  AUTH_USER: 'zodchiy_auth_v2',
  GH_CONFIG: 'zodchiy_cloud_v2',
  DB_KEY: 'zodchiy_state_v2'
};

const DB_NAME = 'Zodchiy_Core_DB';
const STORE_NAME = 'persistence';

// Атомарное хранилище IndexedDB
const idb = {
  db: null as IDBDatabase | null,
  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => { this.db = request.result; resolve(request.result); };
      request.onerror = () => reject(request.error);
    });
  },
  async get(key: string): Promise<any> {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch { return null; }
  },
  async set(key: string, value: any): Promise<void> {
    if (!value) return;
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const request = transaction.objectStore(STORE_NAME).put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) { console.error("IDB Set Error", e); }
  }
};

const encodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
const decodeUnicode = (str: string) => {
  try {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch (e) { return str; }
};

// Ядро синхронизации v2.0.0
const cloud = {
  isLocked: false,
  getConfig: () => {
    try {
      const cfg = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      return cfg ? JSON.parse(cfg) : null;
    } catch { return null; }
  },
  
  // Улучшенный алгоритм слияния (Deep Delta Merge)
  mergeData: <T extends { id: any; updatedAt?: string; createdAt?: string }>(local: T[] = [], remote: T[] = []): T[] => {
    const map = new Map<any, T>();
    // Наполняем карту всеми известными объектами
    [...remote, ...local].forEach(item => {
      if (!item?.id) return;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const newDate = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (newDate >= existingDate) {
          map.set(item.id, item);
        }
      }
    });
    return Array.from(map.values());
  },

  sync: async (localState: AppSnapshot): Promise<{state: AppSnapshot, status: string} | null> => {
    if (cloud.isLocked) return null;
    const config = cloud.getConfig();
    if (!config?.token || !config?.repo) return { state: localState, status: 'local_only' };

    cloud.isLocked = true;
    const url = `https://api.github.com/repos/${config.repo}/contents/${config.path || 'db.json'}`;
    const headers = { 
      'Authorization': `Bearer ${config.token.trim()}`, 
      'Accept': 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache'
    };

    try {
      // 1. Пытаемся получить актуальную версию из облака
      const getRes = await fetch(url, { headers });
      let remoteState: AppSnapshot | null = null;
      let sha = "";

      if (getRes.status === 200) {
        const data = await getRes.json();
        sha = data.sha;
        remoteState = JSON.parse(decodeUnicode(data.content));
      }

      // 2. Сливаем данные по самому свежему timestamp для КАЖДОГО объекта
      const merged: AppSnapshot = {
        ...localState,
        version: APP_VERSION,
        projects: cloud.mergeData(localState.projects, remoteState?.projects),
        tasks: cloud.mergeData(localState.tasks, remoteState?.tasks),
        chatMessages: cloud.mergeData(localState.chatMessages, remoteState?.chatMessages),
        users: cloud.mergeData(localState.users, remoteState?.users),
        lastSync: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      // 3. Выгружаем результат обратно
      const content = encodeUnicode(JSON.stringify(merged));
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `🛠 Core Sync v${APP_VERSION} [${new Date().toLocaleString()}]`, 
          content, 
          sha: sha || undefined 
        })
      });

      if (putRes.status === 409) {
        // Конфликт SHA (кто-то другой успел обновить). Рекурсивно пробуем еще раз.
        cloud.isLocked = false;
        return cloud.sync(merged);
      }

      if (!putRes.ok) throw new Error("Sync Push Denied");

      return { state: merged, status: 'synced' };
    } catch (e) {
      console.error("Cloud Error:", e);
      return { state: localState, status: 'error' };
    } finally {
      cloud.isLocked = false;
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
  const [isInitializing, setIsInitializing] = useState(true);
  
  const syncTimeoutRef = useRef<any>(null);

  // Глобальный метод применения изменений с гарантией сохранения
  const handleUpdateDB = useCallback((updater: (prev: AppSnapshot) => AppSnapshot) => {
    setDb(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      next.timestamp = new Date().toISOString();
      next.version = APP_VERSION;
      
      // Немедленное сохранение в IndexedDB
      idb.set(STORAGE_KEYS.DB_KEY, next);
      
      // Отложенная синхронизация (Debounce)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(async () => {
        setSyncStatus('syncing');
        const res = await cloud.sync(next);
        if (res) {
          setDb(res.state);
          setSyncStatus(res.status as any);
          await idb.set(STORAGE_KEYS.DB_KEY, res.state);
        }
      }, 2500);
      
      return next;
    });
  }, []);

  const performFullSync = useCallback(async (current: AppSnapshot) => {
    setSyncStatus('syncing');
    const result = await cloud.sync(current);
    if (result) {
      setDb(result.state);
      setSyncStatus(result.status as any);
      await idb.set(STORAGE_KEYS.DB_KEY, result.state);
    }
  }, []);

  // Инициализация системы v2.0.0
  useEffect(() => {
    const boot = async () => {
      const local = await idb.get(STORAGE_KEYS.DB_KEY);
      let initial: AppSnapshot;
      
      if (local && local.projects && local.projects.length > 0) {
        initial = local;
      } else {
        // Демо-данные для наглядности (только если база пуста)
        const demoProjectId = 1715000000;
        const now = new Date().toISOString();
        
        initial = {
          version: APP_VERSION, 
          timestamp: now,
          projects: [
            {
              id: demoProjectId,
              name: "Частный дом • Смирнов В.И.",
              description: "Строительство двухэтажного коттеджа из газобетона с монолитным фундаментом.",
              clientFullName: "Смирнов Валентин И.",
              city: "Елизово",
              street: "Олимпийская улица, 42",
              phone: "8 999 0202 5544",
              telegram: "@vsmirnov_kam",
              address: "г. Елизово, ул. Олимпийская, д. 42",
              geoLocation: { lat: 53.1873, lon: 158.3905 },
              fileLinks: [],
              progress: 45,
              status: ProjectStatus.IN_PROGRESS,
              comments: [
                { id: 1, author: "Администратор", role: UserRole.ADMIN, text: "Объект заведен в систему. Все чертежи в разделе хранилища.", createdAt: now }
              ],
              updatedAt: now
            }
          ],
          tasks: [
            {
              id: 2001,
              projectId: demoProjectId,
              title: "Разметка участка и земляные работы",
              description: "Геодезическая разбивка осей, выемка грунта под котлован фундаментной плиты.",
              status: TaskStatus.DONE,
              evidenceUrls: [],
              evidenceCount: 0,
              comments: [],
              updatedAt: now
            },
            {
              id: 2002,
              projectId: demoProjectId,
              title: "Устройство песчано-гравийной подушки",
              description: "Засыпка ПГС слоями по 200мм с послойным тромбованием виброплитой.",
              status: TaskStatus.DONE,
              evidenceUrls: [],
              evidenceCount: 0,
              comments: [],
              updatedAt: now
            },
            {
              id: 2003,
              projectId: demoProjectId,
              title: "Армирование фундаментной плиты",
              description: "Вязка арматурного каркаса (ячейка 200х200мм) в два слоя. Установка фиксаторов.",
              status: TaskStatus.IN_PROGRESS,
              evidenceUrls: [],
              evidenceCount: 0,
              comments: [
                { id: 2, author: "Прораб", role: UserRole.FOREMAN, text: "Арматура завезена полностью, заканчиваем нижний слой.", createdAt: now }
              ],
              updatedAt: now
            },
            {
              id: 2004,
              projectId: demoProjectId,
              title: "Заливка бетона (М350)",
              description: "Прием бетона с автобетоносмесителей. Вибрирование смеси. Контроль зеркала плиты.",
              status: TaskStatus.TODO,
              evidenceUrls: [],
              evidenceCount: 0,
              comments: [],
              updatedAt: now
            }
          ],
          notifications: [],
          chatMessages: [],
          users: [
            { id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' },
            { id: 2, username: 'Прораб', role: UserRole.FOREMAN, password: '123' },
            { id: 3, username: 'Технадзор', role: UserRole.SUPERVISOR, password: '123' }
          ]
        };
      }
      
      setDb(initial);
      setIsInitializing(false);
      
      // Авто-синхронизация при старте
      performFullSync(initial);
    };
    boot();
  }, [performFullSync]);

  // Фоновое обновление при возврате фокуса
  useEffect(() => {
    const onFocus = () => { if (db) performFullSync(db); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [db, performFullSync]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'admin' | 'settings'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);

  if (isInitializing || !db) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-50">Zodchiy Core Initializing...</p>
    </div>
  );

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
          localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify({ token: decoded.token, repo: decoded.repo, path: decoded.path }));
          window.location.reload();
          return true;
        } catch { return false; }
      }}
      onReset={() => {
        if(confirm("ВНИМАНИЕ: Это удалит локальную копию данных. Если облако не настроено, данные пропадут. Продолжить?")) {
          localStorage.clear();
          indexedDB.deleteDatabase(DB_NAME);
          window.location.reload();
        }
      }}
    />
  );

  const selectedProject = db.projects.find(p => p.id === selectedProjectId);
  const selectedTask = db.tasks.find(t => t.id === selectedTaskId);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${activeRole === UserRole.ADMIN ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      <header className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-md transition-all ${activeRole === UserRole.ADMIN ? 'bg-slate-900/80 border-slate-800 shadow-lg' : 'bg-white/80 border-slate-100 shadow-sm'}`}>
        <button onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('dashboard'); }} className="flex items-center gap-3">
          <Logo size={32} isMaster={activeRole === UserRole.ADMIN} />
          <div className="text-left">
            <h1 className={`text-xs font-black uppercase tracking-widest leading-none ${activeRole === UserRole.ADMIN ? 'text-white' : 'text-slate-900'}`}>Зодчий</h1>
            <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-blue-600 text-white mt-1 inline-block">{ROLE_LABELS[activeRole]}</span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => performFullSync(db)}
            className={`flex flex-col items-end px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
              syncStatus === 'syncing' ? 'bg-blue-50 border-blue-200' : 
              syncStatus === 'error' ? 'bg-rose-50 border-rose-200' : 
              syncStatus === 'local_only' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' ? <RefreshCw size={10} className="text-blue-500 animate-spin" /> : 
               syncStatus === 'synced' ? <Zap size={10} className="text-emerald-500 fill-emerald-500" /> : <Cloud size={10} className="text-slate-400" />}
              <span className={`text-[8px] font-black uppercase ${
                syncStatus === 'syncing' ? 'text-blue-600' : syncStatus === 'synced' ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {syncStatus === 'syncing' ? 'ОБМЕН' : syncStatus === 'synced' ? 'АКТУАЛЬНО' : 'OFFLINE'}
              </span>
            </div>
          </button>
          <button onClick={() => { if(confirm('Завершить смену? Все данные синхронизированы.')) { setCurrentUser(null); localStorage.removeItem(STORAGE_KEYS.AUTH_USER); } }} className="p-2 text-slate-400 hover:text-rose-600">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {selectedTaskId && selectedTask ? (
          <TaskDetails 
            task={selectedTask} role={activeRole} isAdmin={activeRole === UserRole.ADMIN} onClose={() => setSelectedTaskId(null)}
            onStatusChange={(tid, st, file, comm) => handleUpdateDB(prev => ({
              ...prev,
              tasks: prev.tasks.map(t => t.id === tid ? { ...t, status: st, supervisorComment: comm || t.supervisorComment, updatedAt: new Date().toISOString() } : t)
            }))}
            onAddComment={(tid, txt) => handleUpdateDB(prev => ({
              ...prev,
              tasks: prev.tasks.map(t => t.id === tid ? { ...t, updatedAt: new Date().toISOString(), comments: [...(t.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : t)
            }))}
            onAddEvidence={(tid, file) => {
               const reader = new FileReader();
               reader.onload = (e) => {
                 const base64 = e.target?.result as string;
                 handleUpdateDB(prev => ({
                   ...prev,
                   tasks: prev.tasks.map(t => t.id === tid ? {
                     ...t,
                     evidenceUrls: [...(t.evidenceUrls || []), base64],
                     evidenceCount: (t.evidenceUrls?.length || 0) + 1,
                     updatedAt: new Date().toISOString()
                   } : t)
                 }));
               };
               reader.readAsDataURL(file);
            }}
            onUpdateTask={(ut) => handleUpdateDB(prev => ({
              ...prev,
              tasks: prev.tasks.map(t => t.id === ut.id ? { ...ut, updatedAt: new Date().toISOString() } : t)
            }))}
          />
        ) : selectedProjectId && selectedProject ? (
          isEditingProject ? (
            <ProjectForm project={selectedProject} onSave={(p) => { handleUpdateDB(prev => ({ ...prev, projects: prev.projects.map(item => item.id === p.id ? { ...p, updatedAt: new Date().toISOString() } : item) })); setIsEditingProject(false); }} onCancel={() => setIsEditingProject(false)} />
          ) : (
            <ProjectView 
              project={selectedProject} tasks={db.tasks.filter(t => t.projectId === selectedProjectId)} currentUser={currentUser} activeRole={activeRole}
              onBack={() => setSelectedProjectId(null)} onEdit={() => setIsEditingProject(true)}
              onAddTask={() => { 
                const nid = Date.now(); 
                handleUpdateDB(prev => ({
                  ...prev,
                  tasks: [{ id: nid, projectId: selectedProjectId, title: 'Новая задача', description: 'Описание работ...', status: TaskStatus.TODO, evidenceUrls: [], evidenceCount: 0, comments: [], updatedAt: new Date().toISOString() }, ...prev.tasks]
                }));
                setSelectedTaskId(nid);
              }}
              onSelectTask={setSelectedTaskId} 
              onSendMessage={(txt) => handleUpdateDB(prev => ({
                ...prev,
                projects: prev.projects.map(p => p.id === selectedProjectId ? { ...p, updatedAt: new Date().toISOString(), comments: [...(p.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : p)
              }))}
              onAddFile={(pid, file, category) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64 = e.target?.result as string;
                  handleUpdateDB(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => p.id === pid ? {
                      ...p,
                      fileLinks: [...(p.fileLinks || []), { id: `f-${Date.now()}`, name: file.name, url: base64, category: category, createdAt: new Date().toISOString() }],
                      updatedAt: new Date().toISOString()
                    } : p)
                  }));
                };
                reader.readAsDataURL(file);
              }}
            />
          )
        ) : isAddingProject ? (
          <ProjectForm project={{} as Project} onSave={(p) => { 
            const nid = Date.now(); 
            handleUpdateDB(prev => ({
              ...prev,
              projects: [{ ...p, id: nid, status: ProjectStatus.NEW, fileLinks: [], progress: 0, comments: [], updatedAt: new Date().toISOString() }, ...prev.projects]
            }));
            setIsAddingProject(false);
            setSelectedProjectId(nid);
          }} onCancel={() => setIsAddingProject(false)} />
        ) : (
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Объекты под контролем</h2>
                  {activeRole === UserRole.ADMIN && <button onClick={() => setIsAddingProject(true)} className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all"><Plus size={20} /></button>}
                </div>
                {db.projects.length === 0 ? (
                  <div className="py-20 flex flex-col items-center text-slate-400 gap-4 opacity-40">
                    <Database size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Список объектов пуст</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {db.projects.map(p => (
                      <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all hover:border-blue-200">
                        <div className="flex gap-4 mb-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Building2 size={24} /></div>
                          <div><h3 className="text-base font-black text-slate-800 uppercase leading-tight">{p.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{p.address}</p></div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <span className="text-[10px] font-black text-blue-600 uppercase">Готовность: {p.progress}%</span>
                          <div className="flex items-center gap-1.5 text-slate-300"><MessageSquare size={12} /> <span className="text-[10px]">{p.comments?.length || 0}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTab === 'chat' && (
              <GlobalChat 
                messages={db.chatMessages || []} 
                currentUser={currentUser} 
                currentRole={activeRole} 
                onSendMessage={(txt) => handleUpdateDB(prev => ({
                  ...prev,
                  chatMessages: [...(prev.chatMessages || []), { id: Date.now(), userId: currentUser.id, username: currentUser.username, role: activeRole, text: txt, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }]
                }))} 
              />
            )}
            {activeTab === 'admin' && activeRole === UserRole.ADMIN && (
              <AdminPanel 
                users={db.users} 
                onUpdateUsers={(users) => handleUpdateDB(prev => ({ ...prev, users }))} 
                currentUser={currentUser} 
                activeRole={activeRole} 
                onRoleSwitch={setActiveRole} 
              />
            )}
            {activeTab === 'settings' && (
              <BackupManager 
                currentUser={currentUser} 
                currentDb={db} 
                onDataImport={(data) => { 
                  handleUpdateDB(() => data); 
                  performFullSync(data); 
                }} 
              />
            )}
          </div>
        )}
      </main>

      {!selectedProjectId && !selectedTaskId && !isAddingProject && (
        <nav className={`fixed bottom-0 left-0 right-0 p-4 pb-8 border-t flex justify-around backdrop-blur-lg z-50 transition-colors ${activeRole === UserRole.ADMIN ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}><LayoutGrid size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Объекты</span></button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'chat' ? 'text-indigo-500' : 'text-slate-400'}`}><MessageSquare size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Команда</span></button>
          {activeRole === UserRole.ADMIN && <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'admin' ? 'text-amber-500' : 'text-slate-400'}`}><ShieldCheck size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Штат</span></button>}
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'settings' ? 'text-slate-600' : 'text-slate-400'}`}><Settings size={22} /><span className="text-[8px] font-black uppercase tracking-tighter">Облако</span></button>
        </nav>
      )}

      {selectedProjectId && <AIAssistant projectContext={`Проект: ${selectedProject?.name}. Описание: ${selectedProject?.description}`} />}
      
      {syncStatus === 'error' && (
        <div className="fixed bottom-24 left-4 right-4 bg-rose-600 text-white p-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-2">
          <ShieldAlert size={20} />
          <p className="text-[10px] font-black uppercase">Ошибка синхронизации. Проверьте интернет или токен GitHub.</p>
        </div>
      )}
    </div>
  );
};

export default App;
