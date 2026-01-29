
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, AppSnapshot, SyncConfig, User, TaskStatus, Project, Task } from './types.ts';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { ProjectForm } from './components/ProjectForm.tsx';
// Fix: Use default import for TaskDetails as it is exported as default in TaskDetails.tsx
import TaskDetails from './components/TaskDetails.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Logo } from './components/Logo.tsx';
import { RefreshCw, LogOut, LayoutGrid, ShieldCheck, Settings, Loader2, Zap } from 'lucide-react';

// Ключи для локального хранилища
const STORAGE_KEY = 'zodchiy_db_v4';
const AUTH_KEY = 'zodchiy_auth_v4';
const CFG_KEY = 'zodchiy_cfg_v4';

const App: React.FC = () => {
  // --- СОСТОЯНИЕ ---
  const [db, setDb] = useState<AppSnapshot | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [config, setConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem(CFG_KEY);
    return saved ? JSON.parse(saved) : { mode: 'local' };
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [activeTab, setActiveTab] = useState<'objects' | 'admin' | 'settings'>('objects');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);

  // --- ЛОГИКА СОХРАНЕНИЯ (CLOUD + LOCAL) ---
  const syncLock = useRef(false);

  const persist = async (data: AppSnapshot) => {
    // 1. Сохраняем локально (мгновенно)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    // 2. Если настроен GitHub, отправляем в облако
    if (config.mode === 'github' && config.github && !syncLock.current) {
      syncLock.current = true;
      setSyncStatus('syncing');
      try {
        const { token, repo, path } = config.github;
        // Получаем SHA файла для обновления
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
          headers: { 'Authorization': `token ${token}` }
        });
        
        let sha = "";
        if (getRes.ok) {
          const fileData = await getRes.json();
          sha = fileData.sha;
        }

        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
          method: 'PUT',
          headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Update: ${new Date().toISOString()}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(data)))),
            sha: sha || undefined
          })
        });

        if (putRes.ok) setSyncStatus('synced');
        else throw new Error();
      } catch (e) {
        setSyncStatus('error');
      } finally {
        syncLock.current = false;
      }
    }
  };

  // --- ОБНОВЛЕНИЕ БАЗЫ ---
  const updateDB = (updater: (prev: AppSnapshot) => AppSnapshot) => {
    setDb(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      next.timestamp = new Date().toISOString();
      persist(next);
      return next;
    });
  };

  // --- ИНИЦИАЛИЗАЦИЯ ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setDb(JSON.parse(saved));
    } else {
      const initial: AppSnapshot = {
        projects: [],
        tasks: [],
        users: [{ id: 1, username: 'Админ', role: UserRole.ADMIN, password: '123' }],
        timestamp: new Date().toISOString()
      };
      setDb(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  if (!currentUser) {
    return <LoginPage onLogin={(user) => {
      setCurrentUser(user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    }} />;
  }

  if (!db) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-blue-500" /></div>;

  const activeRole = currentUser.role;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${activeRole === UserRole.ADMIN ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* HEADER */}
      <header className={`px-5 py-3 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-lg ${activeRole === UserRole.ADMIN ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('objects'); }}>
          <Logo size={28} isMaster={activeRole === UserRole.ADMIN} />
          <div className="text-left">
            <h1 className="text-[10px] font-black uppercase tracking-tighter">Зодчий Core</h1>
            <p className="text-[7px] font-black uppercase text-blue-500">Live Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
            syncStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
            syncStatus === 'syncing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}>
            <RefreshCw size={12} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
            <span className="text-[7px] font-black uppercase">{syncStatus}</span>
          </div>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem(AUTH_KEY); }} className="p-2 text-slate-400"><LogOut size={18} /></button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isEditingProject && selectedProjectId ? (
          <ProjectForm 
            project={db.projects.find(p => p.id === selectedProjectId)!}
            onSave={(updated) => { updateDB(prev => ({ ...prev, projects: prev.projects.map(p => p.id === updated.id ? updated : p) })); setIsEditingProject(false); }}
            onCancel={() => setIsEditingProject(false)}
          />
        ) : selectedTaskId ? (
          <TaskDetails 
            task={db.tasks.find(t => t.id === selectedTaskId)!} 
            role={activeRole} 
            isAdmin={activeRole === UserRole.ADMIN}
            onClose={() => setSelectedTaskId(null)}
            onStatusChange={(tid, st, file, comm) => updateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, status: st, supervisorComment: comm } : t) }))}
            onAddComment={(tid, txt) => updateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), { id: Date.now(), author: currentUser.username, role: activeRole, text: txt, createdAt: new Date().toISOString() }] } : t) }))}
            onAddEvidence={(tid, file) => {
                const reader = new FileReader();
                reader.onload = (e) => updateDB(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === tid ? { ...t, evidence: [...(t.evidence || []), e.target?.result as string] } : t) }));
                reader.readAsDataURL(file);
            }}
          />
        ) : selectedProjectId ? (
          <ProjectView 
            project={db.projects.find(p => p.id === selectedProjectId)!} 
            tasks={db.tasks.filter(t => t.projectId === selectedProjectId)} 
            currentUser={currentUser} 
            activeRole={activeRole}
            onBack={() => setSelectedProjectId(null)} 
            onSelectTask={setSelectedTaskId} 
            onSendMessage={() => {}}
            onEdit={() => setIsEditingProject(true)}
            onAddTask={() => {
              const id = Date.now();
              updateDB(prev => ({ ...prev, tasks: [...prev.tasks, { id, projectId: selectedProjectId, title: 'Новая задача', description: 'Описание...', status: TaskStatus.TODO, evidence: [], comments: [], updatedAt: new Date().toISOString() }] }));
              setSelectedTaskId(id);
            }}
          />
        ) : (
          <div className="space-y-4">
            {activeTab === 'objects' && (
              <>
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Объекты</h2>
                  <button onClick={() => {
                    const id = Date.now();
                    updateDB(prev => ({ ...prev, projects: [...prev.projects, { id, name: 'Новый объект', address: 'Адрес...', phone: '', telegram: '', updatedAt: new Date().toISOString() }] }));
                    setSelectedProjectId(id);
                    setIsEditingProject(true);
                  }} className="p-2 bg-blue-600 text-white rounded-lg"><Zap size={14} /></button>
                </div>
                {db.projects.map(p => (
                  <button key={p.id} onClick={() => setSelectedProjectId(p.id)} className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-left active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 text-xl">🏢</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-slate-800 uppercase truncate">{p.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{p.address}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
            {activeTab === 'admin' && <AdminPanel users={db.users} onUpdateUsers={(u) => updateDB(prev => ({ ...prev, users: u }))} currentUser={currentUser} activeRole={activeRole} onRoleSwitch={() => {}} />}
            {activeTab === 'settings' && <BackupManager currentDb={db} onSyncConfigUpdate={setConfig} onDataImport={setDb} />}
          </div>
        )}
      </main>

      {/* FOOTER NAV */}
      {!selectedProjectId && !selectedTaskId && (
        <nav className={`fixed bottom-0 inset-x-0 p-4 pb-8 border-t flex justify-around backdrop-blur-xl z-50 ${activeRole === UserRole.ADMIN ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100'}`}>
          <button onClick={() => setActiveTab('objects')} className={`flex flex-col items-center gap-1 ${activeTab === 'objects' ? 'text-blue-500' : 'text-slate-400'}`}><LayoutGrid size={22} /><span className="text-[8px] font-black uppercase">Объекты</span></button>
          {activeRole === UserRole.ADMIN && <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-blue-500' : 'text-slate-400'}`}><ShieldCheck size={22} /><span className="text-[8px] font-black uppercase">Штат</span></button>}
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-slate-600' : 'text-slate-400'}`}><Settings size={22} /><span className="text-[8px] font-black uppercase">Система</span></button>
        </nav>
      )}
    </div>
  );
};

export default App;
