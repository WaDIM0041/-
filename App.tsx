
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserRole, Task, TaskStatus, Project, User, ProjectStatus, ROLE_LABELS, Comment, ProjectFile, FileCategory, TASK_STATUS_LABELS } from './types.ts';
import TaskCard from './components/TaskCard.tsx';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectChat } from './components/ProjectChat.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { FilePreviewer } from './components/FilePreviewer.tsx';
import { 
  LayoutGrid, 
  UserCircle, 
  Plus, 
  ChevronRight,
  MapPin,
  Building2,
  Pencil,
  LogOut,
  FileText,
  Paperclip,
  X,
  Wifi,
  Cloud,
  Trash2,
  Users,
  Phone,
  Send,
  Navigation,
  CheckSquare,
  FileCheck
} from 'lucide-react';

export const STORAGE_KEYS = {
  PROJECTS: 'zodchiy_projects_v7',
  TASKS: 'zodchiy_tasks_v7',
  USERS: 'zodchiy_users_v7',
  AUTH_USER: 'zodchiy_auth_v7',
  GH_CONFIG: 'stroy_sync_gh_config_v4',
  LAST_SYNC: 'zodchiy_last_sync_v7'
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Дом в Елизово',
    description: 'Частный коттедж из газобетона. Облицовка кирпичом.',
    clientFullName: 'Иванов Иван Иванович',
    city: 'Елизово',
    street: 'Магистральная, 42',
    phone: '8 900 123 45 67',
    telegram: '@yelizovo_house',
    address: 'г. Елизово, ул. Магистральная, 42',
    geoLocation: { lat: 53.1873, lon: 158.3905 },
    fileLinks: [],
    progress: 35,
    status: ProjectStatus.IN_PROGRESS,
    comments: []
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && parsed.length > 0) ? parsed : INITIAL_PROJECTS;
    } catch { return INITIAL_PROJECTS; }
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    try {
      return JSON.parse(saved || '[]');
    } catch { return []; }
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [
      { id: 1, username: 'Администратор', role: UserRole.ADMIN },
      { id: 2, username: 'Менеджер Объектов', role: UserRole.MANAGER },
      { id: 3, username: 'Главный Прораб', role: UserRole.FOREMAN },
      { id: 4, username: 'Технический Надзор', role: UserRole.SUPERVISOR }
    ];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'admin' | 'backup' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState<Partial<Project>>({});
  const [taskEditForm, setTaskEditForm] = useState<Partial<Task>>({ title: '', description: '' });
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileCategory, setPendingFileCategory] = useState<FileCategory>(FileCategory.DOCUMENT);

  // --- REAL-TIME SYNC LOGIC ---
  const syncWithServer = async (isPush: boolean = false) => {
    if (!currentUser || isSyncing) return;
    setIsSyncing(true);
    try {
      if (isPush) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projects,
            tasks,
            timestamp: Date.now() / 1000
          })
        });
      } else {
        const response = await fetch('/api/sync');
        const data = await response.json();
        if (data.last_updated > (Number(localStorage.getItem(STORAGE_KEYS.LAST_SYNC)) || 0)) {
          setProjects(data.projects);
          setTasks(data.tasks);
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, data.last_updated.toString());
        }
      }
    } catch (e) {
      console.warn("Sync failed - acting in offline mode");
    } finally {
      setIsSyncing(false);
    }
  };

  // Poll for changes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => syncWithServer(false), 10000);
    return () => clearInterval(interval);
  }, [projects, tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [projects, tasks, users]);

  const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const filteredTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProjectId), [tasks, selectedProjectId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setActiveTab('dashboard');
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    syncWithServer(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = `${projectEditForm.city || ''}, ${projectEditForm.street || ''}`;
    let newProjects;
    if (editMode && projectEditForm.id) {
      newProjects = projects.map(p => p.id === projectEditForm.id ? { ...p, ...projectEditForm, address } as Project : p);
    } else {
      const newP: Project = {
        id: Date.now(),
        name: projectEditForm.name || 'Новый объект',
        clientFullName: projectEditForm.clientFullName || '',
        city: projectEditForm.city || '',
        street: projectEditForm.street || '',
        phone: projectEditForm.phone || '',
        telegram: projectEditForm.telegram || '',
        address,
        geoLocation: { lat: 0, lon: 0 },
        fileLinks: [],
        progress: 0,
        status: ProjectStatus.NEW,
        comments: []
      };
      newProjects = [newP, ...projects];
    }
    setProjects(newProjects);
    setShowProjectForm(false);
    setProjectEditForm({});
    // Push update immediately
    setTimeout(() => syncWithServer(true), 100);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    const newT: Task = {
      id: Date.now(),
      projectId: selectedProjectId,
      title: taskEditForm.title || 'Без названия',
      description: taskEditForm.description || '',
      status: TaskStatus.TODO,
      evidenceUrls: [],
      evidenceCount: 0,
      comments: []
    };
    const newTasks = [newT, ...tasks];
    setTasks(newTasks);
    setShowTaskForm(false);
    setTaskEditForm({ title: '', description: '' });
    setTimeout(() => syncWithServer(true), 100);
  };

  const handleStatusChange = (taskId: number, newStatus: TaskStatus, evidence?: File, comment?: string) => {
    const updateTask = (t: Task) => {
      const updated = { ...t, status: newStatus, supervisorComment: comment || t.supervisorComment };
      if (evidence) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setTasks(prev => prev.map(item => item.id === taskId ? { 
            ...updated, 
            evidenceUrls: [...updated.evidenceUrls, reader.result as string],
            evidenceCount: updated.evidenceCount + 1
          } : item));
          setTimeout(() => syncWithServer(true), 500);
        };
        reader.readAsDataURL(evidence);
        return t; // Will be updated async
      }
      return updated;
    };

    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? updateTask(t) : t);
      if (!evidence) setTimeout(() => syncWithServer(true), 100);
      return next;
    });
  };

  const handleAddProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    const url: string = await new Promise((res) => {
      const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(file);
    });
    const newFile: ProjectFile = { name: file.name, url, category: pendingFileCategory, createdAt: new Date().toISOString() };
    setProjects(prev => {
      const next = prev.map(p => p.id === selectedProjectId ? { ...p, fileLinks: [...p.fileLinks, newFile] } : p);
      setTimeout(() => syncWithServer(true), 100);
      return next;
    });
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-24 flex flex-col w-full max-w-2xl mx-auto bg-slate-50 shadow-sm relative overflow-x-hidden">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60] px-4 py-4 sm:py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('dashboard'); }}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-slate-100 shadow-blue-200 shadow-lg">
               <Building2 size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-lg sm:text-xl tracking-tighter uppercase leading-none text-slate-800">ЗОДЧИЙ</h1>
              <div className="flex items-center gap-1 mt-1">
                <Wifi size={10} className={isSyncing ? "text-amber-500 animate-pulse" : "text-emerald-500"} />
                <span className={`text-[8px] font-black uppercase tracking-tighter ${isSyncing ? "text-amber-600" : "text-emerald-600"}`}>
                  {isSyncing ? "Syncing..." : "Live Sync"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-blue-600 px-2 py-1.5 bg-blue-50 rounded-lg">{ROLE_LABELS[activeRole]}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden text-slate-800">
        {activeTab === 'dashboard' && !selectedProjectId && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest text-left">Объекты ({projects.length})</h2>
              {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                <button onClick={() => { setEditMode(false); setShowProjectForm(true); }} className="bg-blue-600 text-slate-100 p-2.5 rounded-xl shadow-lg active:scale-90 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="grid gap-3">
              {projects.map(p => (
                <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group">
                  <div className="flex items-center gap-4 sm:gap-5 overflow-hidden">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-slate-100 transition-all">
                      <MapPin size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="truncate text-left">
                      <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">{p.name}</h4>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">{p.address}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 shrink-0 group-hover:text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
             <h2 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest text-left">Все задачи ({tasks.length})</h2>
             <div className="grid gap-3">
               {tasks.map(t => (
                 <div key={t.id} onClick={() => { 
                   setSelectedProjectId(t.projectId); 
                   setSelectedTaskId(t.id);
                 }}>
                   <TaskCard task={t} role={activeRole} onStatusChange={() => {}} onAddComment={() => {}} />
                   <p className="text-[9px] font-black uppercase text-blue-600 ml-5 -mt-2 mb-2 italic text-left">Объект: {projects.find(p => p.id === t.projectId)?.name}</p>
                 </div>
               ))}
             </div>
          </div>
        )}

        {selectedProjectId && currentProject && !selectedTaskId && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedProjectId(null)} className="text-slate-500 font-black text-[10px] uppercase flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                <ChevronRight className="rotate-180" size={16}/> Назад
              </button>
              <div className="flex gap-2">
                {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                  <>
                    <button onClick={() => { setProjectEditForm(currentProject); setEditMode(true); setShowProjectForm(true); }} className="p-2.5 bg-white text-blue-600 rounded-xl border border-slate-100 shadow-sm"><Pencil size={18}/></button>
                    <button onClick={() => { if(window.confirm('Удалить объект?')) { setProjects(prev => prev.filter(p => p.id !== currentProject.id)); setSelectedProjectId(null); syncWithServer(true); }}} className="p-2.5 bg-white text-rose-500 rounded-xl border border-slate-100 shadow-sm"><Trash2 size={18}/></button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Building2 size={28} /></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-slate-800 leading-tight">{currentProject.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{currentProject.address}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Прогресс объекта</span>
                      <span className="text-[9px] font-black text-blue-600">{currentProject.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${currentProject.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8 border-t border-slate-50 pt-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Чат объекта</h4>
                <ProjectChat messages={currentProject.comments || []} currentUser={currentUser} currentRole={activeRole} onSendMessage={(t) => {
                  const newComment: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text: t, createdAt: new Date().toISOString() };
                  setProjects(prev => {
                    const next = prev.map(p => p.id === currentProject.id ? { ...p, comments: [...(p.comments || []), newComment] } : p);
                    setTimeout(() => syncWithServer(true), 100);
                    return next;
                  });
                }} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Работы ({filteredTasks.length})</h4>
                  {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                    <button onClick={() => setShowTaskForm(true)} className="p-2 bg-blue-600 text-slate-100 rounded-xl shadow-lg"><Plus size={18} /></button>
                  )}
                </div>
                <div className="grid gap-3">
                  {filteredTasks.map(t => (
                    <div key={t.id} onClick={() => setSelectedTaskId(t.id)}>
                      <TaskCard task={t} role={activeRole} onStatusChange={() => {}} onAddComment={() => {}} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTaskId && (tasks.find(t => t.id === selectedTaskId)) && (
          <TaskDetails 
            task={tasks.find(t => t.id === selectedTaskId)!} 
            role={activeRole} 
            onClose={() => setSelectedTaskId(null)} 
            onStatusChange={handleStatusChange} 
            onAddComment={(tid, text) => {
              const c: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text, createdAt: new Date().toISOString() };
              setTasks(prev => {
                const next = prev.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), c] } : t);
                setTimeout(() => syncWithServer(true), 100);
                return next;
              });
            }}
            onAddEvidence={(tid, file) => {
               const r = new FileReader(); r.onloadend = () => {
                 setTasks(prev => {
                   const next = prev.map(t => t.id === tid ? { ...t, evidenceUrls: [...t.evidenceUrls, r.result as string], evidenceCount: t.evidenceCount + 1 } : t);
                   setTimeout(() => syncWithServer(true), 500);
                   return next;
                 });
               }; r.readAsDataURL(file);
            }}
            onUpdateTask={(ut) => {
              setTasks(prev => {
                const next = prev.map(t => t.id === ut.id ? ut : t);
                setTimeout(() => syncWithServer(true), 100);
                return next;
              });
            }}
          />
        )}

        {activeTab === 'admin' && <AdminPanel users={users} onUpdateUsers={setUsers} currentUser={currentUser!} activeRole={activeRole} onRoleSwitch={setActiveRole} />}
        {activeTab === 'backup' && <BackupManager currentUser={currentUser} onDataImport={(d) => { if(d.projects) setProjects(d.projects); if(d.tasks) setTasks(d.tasks); if(d.users) setUsers(d.users); syncWithServer(true); }} />}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 text-center space-y-6 animate-in slide-in-from-bottom-4 shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 text-slate-100 rounded-[2rem] flex items-center justify-center mx-auto text-2xl font-black shadow-xl border-4 border-white">{currentUser?.username[0].toUpperCase()}</div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{currentUser?.username}</h3>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{ROLE_LABELS[activeRole]}</p>
            </div>
            <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-black py-5 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border border-rose-100"><LogOut size={18} /> Выйти</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-[70] w-full max-w-2xl mx-auto rounded-t-3xl shadow-2xl safe-area-bottom">
        <div className="flex justify-around items-center py-4 px-2">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'dashboard' ? 'text-blue-600 scale-105' : 'text-slate-300'}`}>
            <LayoutGrid size={22} strokeWidth={activeTab === 'dashboard' ? 3 : 2} /><span className="text-[7px] font-black uppercase">Объекты</span>
          </button>
          <button onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'tasks' ? 'text-blue-600 scale-105' : 'text-slate-300'}`}>
            <CheckSquare size={22} strokeWidth={activeTab === 'tasks' ? 3 : 2} /><span className="text-[7px] font-black uppercase">Задачи</span>
          </button>
          {activeRole === UserRole.ADMIN && (
            <>
              <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'admin' ? 'text-blue-600 scale-105' : 'text-slate-300'}`}>
                <Users size={22} strokeWidth={activeTab === 'admin' ? 3 : 2} /><span className="text-[7px] font-black uppercase">Команда</span>
              </button>
              <button onClick={() => setActiveTab('backup')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'backup' ? 'text-blue-600 scale-105' : 'text-slate-300'}`}>
                <Cloud size={22} strokeWidth={activeTab === 'backup' ? 3 : 2} /><span className="text-[7px] font-black uppercase">Облако</span>
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'profile' ? 'text-blue-600 scale-105' : 'text-slate-300'}`}>
            <UserCircle size={22} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[7px] font-black uppercase">Профиль</span>
          </button>
        </div>
      </nav>

      {showProjectForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] text-left">
            <button onClick={() => setShowProjectForm(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={20}/></button>
            <h3 className="text-lg sm:text-xl font-black uppercase mb-6 tracking-tighter text-slate-800">{editMode ? 'Редактировать' : 'Новый объект'}</h3>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Название</label>
                <input required placeholder="Дом в Елизово" value={projectEditForm.name || ''} onChange={e => setProjectEditForm({...projectEditForm, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold text-slate-900 border border-slate-100 placeholder:text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Город</label>
                  <input required placeholder="Елизово" value={projectEditForm.city || ''} onChange={e => setProjectEditForm({...projectEditForm, city: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 border border-slate-100 placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Улица</label>
                  <input required placeholder="Магистральная" value={projectEditForm.street || ''} onChange={e => setProjectEditForm({...projectEditForm, street: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 border border-slate-100 placeholder:text-slate-400" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-slate-100 font-black py-5 rounded-2xl uppercase text-[10px] shadow-xl hover:bg-blue-700 transition-all">Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {showTaskForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-left">
            <button onClick={() => setShowTaskForm(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={20}/></button>
            <h3 className="text-lg font-black uppercase mb-6 tracking-tighter text-slate-800">Новая задача</h3>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <input required placeholder="Суть работы..." value={taskEditForm.title} onChange={e => setTaskEditForm({...taskEditForm, title: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 border border-slate-100 outline-none placeholder:text-slate-400" />
              <textarea placeholder="Детали..." value={taskEditForm.description} onChange={e => setTaskEditForm({...taskEditForm, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 min-h-[120px] border border-slate-100 outline-none placeholder:text-slate-400" />
              <button type="submit" className="w-full bg-blue-600 text-slate-100 font-black py-5 rounded-2xl uppercase text-[10px] shadow-xl">Добавить</button>
            </form>
          </div>
        </div>
      )}

      {previewFile && <FilePreviewer url={previewFile.url} name={previewFile.name} category={previewFile.category} onClose={() => setPreviewFile(null)} />}
      
      {currentUser && (
        <AIAssistant projectContext={currentProject ? `Объект: ${currentProject.name}. Задач: ${filteredTasks.length}` : 'Общий обзор'} />
      )}
    </div>
  );
};

export default App;
