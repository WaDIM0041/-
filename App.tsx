import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, Comment, APP_VERSION, AppNotification, GlobalChatMessage, AppSnapshot, FileCategory, GithubConfig, InvitePayload 
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
  LayoutGrid, 
  UserCircle, 
  LogOut,
  CheckSquare,
  RefreshCw,
  Bell,
  MessageSquare,
  Cloud,
  Zap,
  Building2,
  HardDrive,
  DownloadCloud,
  Crown,
  Wifi,
  WifiOff
} from 'lucide-react';

export const STORAGE_KEYS = {
  MASTER_STATE: `zodchiy_master_v150`,
  AUTH_USER: `zod_auth_v150`,
  GH_CONFIG: `zod_gh_v150`
};

const toBase64 = (str: string) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
    String.fromCharCode(parseInt(p1, 16))
  ));
};

const fromBase64 = (str: string) => {
  try {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch (e) {
    console.error("Base64 Decode Error:", e);
    return str;
  }
};

const generateUID = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Объект "Елизово-Холл"',
    description: 'Строительство загородного дома премиум-класса.',
    clientFullName: 'Александров А.А.',
    city: 'Елизово',
    street: 'Магистральная, 42',
    phone: '+7 900 123-45-67',
    telegram: 'yelizovo_pro',
    address: 'г. Елизово, ул. Магистральная, 42',
    geoLocation: { lat: 53.1873, lon: 158.3905 },
    fileLinks: [],
    progress: 45,
    status: ProjectStatus.IN_PROGRESS,
    comments: [],
    updatedAt: new Date().toISOString()
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const syncLockRef = useRef(false);
  
  const [db, setDb] = useState<AppSnapshot>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MASTER_STATE);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      // Если версия совпадает - загружаем
      if (parsed && parsed.version === APP_VERSION) return parsed;
      
      // Если старая версия - обновляем версию в объекте
      if (parsed && parsed.version) {
        return { ...parsed, version: APP_VERSION };
      }
      
      return {
        version: APP_VERSION,
        buildNumber: 1,
        timestamp: new Date().toISOString(),
        projects: INITIAL_PROJECTS,
        tasks: [],
        users: [
          { id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' },
          { id: 4, username: 'Менеджер', role: UserRole.MANAGER, password: '123' },
          { id: 2, username: 'Прораб', role: UserRole.FOREMAN, password: '123' },
          { id: 3, username: 'Технадзор', role: UserRole.SUPERVISOR, password: '123' }
        ],
        notifications: [],
        chatMessages: []
      };
    } catch { 
      return { version: APP_VERSION, buildNumber: 1, timestamp: new Date().toISOString(), projects: INITIAL_PROJECTS, tasks: [], users: [], notifications: [], chatMessages: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'sync' | 'chat' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const isMasterMode = activeRole === UserRole.ADMIN;

  // --- CLOUD SYNC LOGIC ---

  const pushToCloud = useCallback(async (currentSnapshot: AppSnapshot) => {
    const rawConfig = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
    if (!rawConfig) return;
    
    try {
      const config: GithubConfig = JSON.parse(rawConfig);
      if (!config.token || !config.repo) return;

      setIsSyncing(true);
      const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}`;
      const headers = {
        'Authorization': `Bearer ${config.token.trim()}`,
        'Accept': 'application/vnd.github+json'
      };

      let sha = "";
      const getRes = await fetch(url, { headers, cache: 'no-store' });
      if (getRes.ok) {
        const file = await getRes.json();
        sha = file.sha;
      }

      const content = toBase64(JSON.stringify(currentSnapshot, null, 2));
      await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Push v${APP_VERSION} from ${currentUser?.username}`, content, sha: sha || undefined })
      });
      setSyncError(false);
    } catch (e) {
      console.error("Cloud push failed", e);
      setSyncError(true);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  }, [currentUser]);

  const smartMerge = useCallback((remote: AppSnapshot, local: AppSnapshot): AppSnapshot => {
    const mergeArrays = <T extends { id: any, updatedAt?: string, createdAt?: string }>(arr1: T[], arr2: T[]): T[] => {
      const map = new Map<any, T>();
      // Сначала локальные (приоритет по времени)
      arr1.forEach(item => map.set(item.id, item));
      // Затем удаленные (если они свежее)
      arr2.forEach(item => {
        const existing = map.get(item.id);
        const time1 = new Date(item.updatedAt || item.createdAt || 0).getTime();
        const time2 = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : 0;
        if (!existing || time1 > time2) {
          map.set(item.id, item);
        }
      });
      return Array.from(map.values());
    };

    return {
      ...remote,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      projects: mergeArrays(local.projects, remote.projects),
      tasks: mergeArrays(local.tasks, remote.tasks),
      chatMessages: mergeArrays(local.chatMessages, remote.chatMessages),
      notifications: mergeArrays(local.notifications, remote.notifications),
      users: remote.users 
    };
  }, []);

  const handleImportData = useCallback((data: AppSnapshot) => {
    setDb(prev => smartMerge(data, prev));
  }, [smartMerge]);

  // Фоновая синхронизация - ускорена до 10с для отзывчивости чата
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (syncLockRef.current) return;
      const rawConfig = localStorage.getItem(STORAGE_KEYS.GH_CONFIG);
      if (!rawConfig) return;
      
      try {
        syncLockRef.current = true;
        const config: GithubConfig = JSON.parse(rawConfig);
        if (!config.token || !config.repo) return;
        
        const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}`;
        const response = await fetch(url, { 
          headers: { 
            'Authorization': `Bearer ${config.token.trim()}`,
            'Accept': 'application/vnd.github+json'
          },
          cache: 'no-store' 
        });
        
        if (response.ok) {
          const data = await response.json();
          const remoteDb = JSON.parse(fromBase64(data.content)) as AppSnapshot;
          if (new Date(remoteDb.timestamp).getTime() > new Date(db.timestamp).getTime()) {
            handleImportData(remoteDb);
          }
          setSyncError(false);
        }
      } catch (err) {
        console.warn("Sync fetch error", err);
      } finally {
        syncLockRef.current = false;
      }
    }, 10000); 
    return () => clearInterval(pollInterval);
  }, [db.timestamp, handleImportData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MASTER_STATE, JSON.stringify(db));
  }, [db]);

  // --- ACTIONS ---

  const createNotification = (notif: Partial<AppNotification>) => {
    const newNotif: AppNotification = {
      id: Date.now(),
      type: notif.type || 'info',
      projectTitle: notif.projectTitle || 'Система',
      taskTitle: notif.taskTitle || '',
      message: notif.message || '',
      targetRole: notif.targetRole || UserRole.ADMIN,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    return newNotif;
  };

  const handleApplyInvite = useCallback((code: string) => {
    try {
      const invite: InvitePayload = JSON.parse(fromBase64(code));
      if (invite.token && invite.repo && invite.role) {
        const newGhConfig: GithubConfig = { 
          token: invite.token, 
          repo: invite.repo, 
          path: invite.path || 'zodchiy_db.json' 
        };
        localStorage.setItem(STORAGE_KEYS.GH_CONFIG, JSON.stringify(newGhConfig));
        
        const targetUser = db.users.find(u => u.role === invite.role) || db.users[0];
        setCurrentUser(targetUser);
        setActiveRole(targetUser.role);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(targetUser));
        
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [db.users]);

  const updateTaskStatus = (taskId: number, newStatus: TaskStatus, evidenceFile?: File, comment?: string) => {
    const task = db.tasks.find(t => t.id === taskId);
    const project = db.projects.find(p => p.id === task?.projectId);
    
    setDb(prev => {
      let evidenceUrl = '';
      if (evidenceFile) {
        evidenceUrl = URL.createObjectURL(evidenceFile);
      }

      const newNotifications = [...prev.notifications];
      
      if (newStatus === TaskStatus.REVIEW) {
        newNotifications.push(createNotification({
          type: 'review', projectTitle: project?.name, taskTitle: task?.title,
          message: `${currentUser?.username} сдал работу. Требуется проверка технадзора.`,
          targetRole: UserRole.SUPERVISOR
        }));
      } else if (newStatus === TaskStatus.DONE) {
        newNotifications.push(createNotification({
          type: 'done', projectTitle: project?.name, taskTitle: task?.title,
          message: `Работа принята технадзором.`, targetRole: UserRole.FOREMAN
        }));
      } else if (newStatus === TaskStatus.REWORK) {
        newNotifications.push(createNotification({
          type: 'rework', projectTitle: project?.name, taskTitle: task?.title,
          message: `Технадзор выявил замечания: ${comment}`, targetRole: UserRole.FOREMAN
        }));
      }

      const updatedSnapshot: AppSnapshot = {
        ...prev,
        timestamp: new Date().toISOString(),
        notifications: newNotifications,
        tasks: prev.tasks.map(t => {
          if (t.id === taskId) {
            const updated = { ...t, status: newStatus, updatedAt: new Date().toISOString() };
            if (comment) updated.supervisorComment = comment;
            if (evidenceUrl) {
              updated.evidenceUrls = [...(updated.evidenceUrls || []), evidenceUrl];
              updated.evidenceCount = updated.evidenceUrls.length;
            }
            return updated;
          }
          return t;
        })
      };
      
      pushToCloud(updatedSnapshot);
      return updatedSnapshot;
    });
  };

  const handleSendMessage = (text: string, projectId?: number) => {
    setDb(prev => {
      let updatedSnapshot: AppSnapshot;
      if (projectId) {
        updatedSnapshot = {
          ...prev,
          timestamp: new Date().toISOString(),
          projects: prev.projects.map(p => p.id === projectId ? {
            ...p,
            updatedAt: new Date().toISOString(),
            comments: [...(p.comments || []), {
              id: generateUID('cmt'), author: currentUser?.username || '?', role: activeRole, text, createdAt: new Date().toISOString()
            }]
          } : p)
        };
      } else {
        updatedSnapshot = {
          ...prev,
          timestamp: new Date().toISOString(),
          chatMessages: [...prev.chatMessages, {
            id: generateUID('chat'), userId: currentUser?.id || 0, username: currentUser?.username || '?', role: activeRole, text, createdAt: new Date().toISOString()
          }]
        };
      }
      
      pushToCloud(updatedSnapshot);
      return updatedSnapshot;
    });
  };

  const resetToHome = () => {
    setActiveTab('dashboard');
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setEditingProject(null);
    setShowNotifications(false);
  };

  if (!currentUser) return <LoginPage users={db.users} onLogin={(u) => { setCurrentUser(u); setActiveRole(u.role); localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(u)); }} onApplyInvite={handleApplyInvite} />;

  const selectedProject = db.projects.find(p => p.id === selectedProjectId);
  const selectedTask = db.tasks.find(t => t.id === selectedTaskId);

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-500 ${isMasterMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      <header className={`px-6 py-5 border-b flex items-center justify-between shrink-0 z-40 transition-all duration-500 ${isMasterMode ? 'bg-slate-900 border-white/5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)]' : 'bg-white border-slate-100 text-slate-900 shadow-sm'}`}>
        <button onClick={resetToHome} className="flex items-center gap-3 active:scale-95 transition-all text-left group">
          <Logo isMaster={isMasterMode} size={44} className="group-hover:rotate-6 transition-transform" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-3">
              <h1 className={`text-xl font-black tracking-tighter leading-none shrink-0 ${isMasterMode ? 'text-white' : 'text-slate-900'}`}>ЗОДЧИЙ</h1>
              <div className={`h-4 w-1 rounded-full shrink-0 ${isMasterMode ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-blue-600/30'}`}></div>
              <span className={`text-sm font-black leading-none uppercase tracking-tight truncate max-w-[140px] pt-0.5 ${isMasterMode ? 'text-yellow-400' : 'text-slate-800'}`}>
                {currentUser.username}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
              <span className={`text-[8px] font-black leading-none uppercase tracking-widest shrink-0 flex items-center gap-1 ${isMasterMode ? 'text-yellow-500' : 'text-blue-600'}`}>
                {isMasterMode && <Crown size={8} />} {ROLE_LABELS[activeRole]}
              </span>
              <div className={`w-1 h-1 rounded-full shrink-0 ${isMasterMode ? 'bg-white/20' : 'bg-slate-300'}`}></div>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${isSyncing ? 'bg-blue-500/10 text-blue-400' : syncError ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {syncError ? <WifiOff size={8} /> : <Wifi size={8} className={isSyncing ? "animate-pulse" : ""} />}
                {isSyncing ? "Синхронизация..." : syncError ? "Оффлайн" : "В сети"}
              </div>
              <p className={`text-[7px] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap ml-2 opacity-40`}>v{APP_VERSION}</p>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2.5 rounded-xl transition-all ${isMasterMode ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}>
            <Bell size={20} />
            {db.notifications.some(n => !n.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-md border-2 ${isMasterMode ? 'bg-yellow-500 text-slate-900 border-white/20' : 'bg-blue-600 text-white border-white'}`}>
            {currentUser.username[0]}
          </button>
        </div>
      </header>

      {showNotifications && (
        <NotificationCenter 
          notifications={db.notifications} 
          currentRole={activeRole} 
          onClose={() => setShowNotifications(false)}
          onMarkRead={(id) => setDb(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? {...n, isRead: true} : n)}))}
          onClearAll={() => setDb(prev => ({ ...prev, notifications: [] }))}
        />
      )}

      <main className={`flex-1 overflow-y-auto p-4 sm:p-6 pb-32 text-left scrollbar-hide ${isMasterMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        {editingProject ? (
          <ProjectForm project={editingProject} onSave={(p) => { 
            const updated = { ...db, timestamp: new Date().toISOString(), projects: db.projects.map(old => old.id === p.id ? p : old) };
            setDb(updated); pushToCloud(updated); setEditingProject(null); 
          }} onCancel={() => setEditingProject(null)} />
        ) : selectedTaskId ? (
          <TaskDetails 
            task={selectedTask!} role={activeRole} isAdmin={activeRole === UserRole.ADMIN}
            onClose={() => setSelectedTaskId(null)} onStatusChange={updateTaskStatus}
            onAddComment={(tid, txt) => {
               setDb(prev => {
                 const updated = {
                   ...prev, timestamp: new Date().toISOString(),
                   tasks: prev.tasks.map(t => t.id === tid ? {
                     ...t, updatedAt: new Date().toISOString(),
                     comments: [...(t.comments || []), { id: generateUID('msg'), author: currentUser?.username || '?', role: activeRole, text: txt, createdAt: new Date().toISOString() }]
                   } : t)
                 };
                 pushToCloud(updated); return updated;
               });
            }}
            onAddEvidence={(tid, file) => updateTaskStatus(tid, selectedTask!.status, file)}
          />
        ) : selectedProjectId ? (
          <ProjectView 
            project={selectedProject!} tasks={db.tasks.filter(t => t.projectId === selectedProjectId)}
            currentUser={currentUser} activeRole={activeRole}
            onBack={() => setSelectedProjectId(null)} onEdit={setEditingProject}
            onAddTask={() => {}} onSelectTask={setSelectedTaskId}
            onSendMessage={(txt) => handleSendMessage(txt, selectedProjectId)}
            onAddFile={(pid, file, cat) => {
              const fileUrl = URL.createObjectURL(file);
              setDb(prev => {
                const updated = {
                  ...prev, timestamp: new Date().toISOString(),
                  projects: prev.projects.map(p => p.id === pid ? { ...p, fileLinks: [...(p.fileLinks || []), { name: file.name, url: fileUrl, category: cat, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() } : p)
                };
                pushToCloud(updated); return updated;
              });
            }}
          />
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] ml-1 ${isMasterMode ? 'text-white/40' : 'text-slate-400'}`}>Объекты в управлении</h2>
            <div className="grid gap-4">
              {db.projects.map(p => (
                <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className={`p-6 rounded-[2rem] border shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer ${isMasterMode ? 'bg-slate-900 border-white/5 hover:border-yellow-500/50' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${isMasterMode ? 'bg-white/5 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-slate-900' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>{p.name[0]}</div>
                    <div className="text-left">
                      <h3 className={`font-black tracking-tight leading-none mb-1 transition-colors ${isMasterMode ? 'text-white group-hover:text-yellow-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{p.name}</h3>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${isMasterMode ? 'text-white/40' : 'text-slate-400'}`}>{p.address}</p>
                    </div>
                  </div>
                  <LayoutGrid size={18} className={`${isMasterMode ? 'text-white/20 group-hover:text-yellow-500' : 'text-slate-200 group-hover:text-blue-600'}`} />
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          <GlobalChat 
            messages={db.chatMessages} currentUser={currentUser} currentRole={activeRole} 
            onSendMessage={(txt) => handleSendMessage(txt)} 
          />
        ) : activeTab === 'admin' ? (
          <AdminPanel users={db.users} currentUser={currentUser} activeRole={activeRole} onUpdateUsers={(u) => setDb(prev => ({ ...prev, timestamp: new Date().toISOString(), users: u }))} onRoleSwitch={setActiveRole} />
        ) : activeTab === 'sync' ? (
          <BackupManager currentUser={currentUser} currentDb={db} onDataImport={handleImportData} />
        ) : (
          <div className="space-y-6">
            <div className={`p-8 rounded-[2.5rem] border shadow-sm text-center ${isMasterMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isMasterMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-50 text-blue-600'}`}>
                <UserCircle size={48} />
              </div>
              <h2 className={`text-xl font-black mb-1 uppercase tracking-tighter ${isMasterMode ? 'text-white' : 'text-slate-800'}`}>{currentUser.username}</h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-8 ${isMasterMode ? 'text-yellow-500' : 'text-blue-600'}`}>{ROLE_LABELS[activeRole]}</p>
              <button onClick={() => { setCurrentUser(null); localStorage.removeItem(STORAGE_KEYS.AUTH_USER); }} className="w-full py-4 font-black rounded-2xl border flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] transition-all bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white">
                <LogOut size={18} /> Выйти
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 left-0 right-0 border-t px-6 pt-4 pb-[calc(1rem+var(--sab))] flex items-center justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] transition-all duration-500 ${isMasterMode ? 'bg-slate-900/90 backdrop-blur-2xl border-white/5' : 'bg-white/90 backdrop-blur-2xl border-slate-100'}`}>
        <button onClick={resetToHome} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? (isMasterMode ? 'text-yellow-500 scale-110' : 'text-blue-600 scale-110') : (isMasterMode ? 'text-white/30' : 'text-slate-400')}`}>
          <LayoutGrid size={22} />
          <span className="text-[7px] font-black uppercase tracking-widest">Объекты</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'chat' ? (isMasterMode ? 'text-yellow-500 scale-110' : 'text-blue-600 scale-110') : (isMasterMode ? 'text-white/30' : 'text-slate-400')}`}>
          <MessageSquare size={22} />
          <span className="text-[7px] font-black uppercase tracking-widest">Чат</span>
        </button>
        {activeRole === UserRole.ADMIN && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-amber-500 scale-110' : (isMasterMode ? 'text-white/30' : 'text-slate-400')}`}>
            <CheckSquare size={22} />
            <span className="text-[7px] font-black uppercase tracking-widest">Админ</span>
          </button>
        )}
        <button onClick={() => setActiveTab('sync')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'sync' ? (isMasterMode ? 'text-indigo-400 scale-110' : 'text-indigo-600 scale-110') : (isMasterMode ? 'text-white/30' : 'text-slate-400')}`}>
          <div className="relative">
            <RefreshCw size={22} className={isSyncing ? "animate-spin" : ""} />
            <Cloud size={8} className="absolute -top-1 -right-1 text-indigo-500" />
          </div>
          <span className="text-[7px] font-black uppercase tracking-widest">Синхро</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? (isMasterMode ? 'text-yellow-500 scale-110' : 'text-blue-600 scale-110') : (isMasterMode ? 'text-white/30' : 'text-slate-400')}`}>
          <UserCircle size={22} />
          <span className="text-[7px] font-black uppercase tracking-widest">Профиль</span>
        </button>
      </nav>

      <AIAssistant projectContext={selectedProject?.name || "Общий контекст"} />
    </div>
  );
};

export default App;