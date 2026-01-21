
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserRole, Task, TaskStatus, Project, User, ProjectStatus, ROLE_LABELS, Comment, ProjectFile, FileCategory, APP_VERSION, AppNotification } from './types.ts';
import TaskDetails from './components/TaskDetails.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { BackupManager } from './components/BackupManager.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ProjectView } from './components/ProjectView.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { 
  LayoutGrid, 
  UserCircle, 
  Plus, 
  ChevronRight,
  MapPin,
  Building2,
  LogOut,
  Cloud,
  Users,
  CheckSquare,
  RotateCcw,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  X,
  Trash2,
  Save,
  FilePlus,
  ArrowUpCircle
} from 'lucide-react';

export const STORAGE_KEYS = {
  PROJECTS: `zodchiy_projects_v${APP_VERSION}`,
  TASKS: `zodchiy_tasks_v${APP_VERSION}`,
  USERS: `zodchiy_users_v${APP_VERSION}`,
  AUTH_USER: `zodchiy_auth_v${APP_VERSION}`,
  GH_CONFIG: `zodchiy_gh_config_v${APP_VERSION}`,
  LAST_SYNC: `zodchiy_last_sync_v${APP_VERSION}`,
  NOTIFICATIONS: `zodchiy_notifs_v${APP_VERSION}`
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Объект "Елизово-Холл"',
    description: 'Строительство загородного дома премиум-класса. Площадь 250м2.',
    clientFullName: 'Александров Александр Александрович',
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

const INITIAL_TASKS: Task[] = [
  {
    id: 101,
    projectId: 1,
    title: 'Армирование фундамента',
    description: 'Вязка арматуры по проекту КЖ-1. Проверка шага ячейки 200х200.',
    status: TaskStatus.DONE,
    evidenceUrls: ['https://images.unsplash.com/photo-1590059393043-da5357876356?auto=format&fit=crop&q=80&w=600'],
    evidenceCount: 1,
    comments: [
      { id: 1, author: 'Технадзор', role: UserRole.SUPERVISOR, text: 'Армирование выполнено качественно. Замечаний нет.', createdAt: new Date().toISOString() }
    ],
    updatedAt: new Date().toISOString()
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
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && parsed.length > 0) ? parsed : INITIAL_TASKS;
    } catch { return INITIAL_TASKS; }
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

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : [
      { id: 1, type: 'review', projectTitle: 'Елизово-Холл', taskTitle: 'Система', message: `Успешное обновление до версии v${APP_VERSION}!`, targetRole: UserRole.ADMIN, isRead: false, createdAt: new Date().toISOString() }
    ];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'admin' | 'backup' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectEditMode, setProjectEditMode] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState<Partial<Project>>({});

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskEditForm, setTaskEditForm] = useState<Partial<Task>>({ title: '', description: '' });
  const [showNotifications, setShowNotifications] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ГАРАНТИЯ ОТКРЫТИЯ ЗАДАЧИ - Высокий приоритет в логике отображения
  const activeTask = useMemo(() => {
    if (selectedTaskId === null) return null;
    return tasks.find(t => Number(t.id) === Number(selectedTaskId)) || null;
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId !== null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedTaskId]);

  const performSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (e) { console.error("Sync failed", e); } finally { setIsSyncing(false); }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [projects, tasks, users, notifications]);

  const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const filteredTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProjectId), [tasks, selectedProjectId]);
  const unreadCount = notifications.filter(n => !n.isRead && (n.targetRole === activeRole || activeRole === UserRole.ADMIN)).length;

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  };

  const addNotification = (type: any, projTitle: string, taskTitle: string, msg: string, role: UserRole) => {
    const newNotif: AppNotification = {
      id: Date.now(),
      type,
      projectTitle: projTitle,
      taskTitle,
      message: msg,
      targetRole: role,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    if (projectEditMode && projectEditForm.id) {
      setProjects(projects.map(p => p.id === projectEditForm.id ? { ...p, ...projectEditForm, updatedAt: now } as Project : p));
    } else {
      const newProject: Project = { ...projectEditForm, id: Date.now(), progress: 0, status: ProjectStatus.NEW, fileLinks: [], comments: [], updatedAt: now, geoLocation: { lat: 0, lon: 0 } } as Project;
      setProjects([...projects, newProject]);
    }
    setShowProjectForm(false);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    const newTask: Task = {
      id: Date.now(),
      projectId: selectedProjectId,
      title: taskEditForm.title || 'Новая задача',
      description: taskEditForm.description || '',
      status: TaskStatus.TODO,
      evidenceUrls: [],
      evidenceCount: 0,
      comments: [],
      updatedAt: new Date().toISOString()
    };
    setTasks([...tasks, newTask]);
    setShowTaskForm(false);
    setTaskEditForm({ title: '', description: '' });
    addNotification('review', currentProject?.name || 'Объект', newTask.title, 'Добавлена новая задача на объект.', UserRole.FOREMAN);
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-24 flex flex-col w-full max-w-2xl mx-auto bg-slate-50 shadow-sm relative overflow-x-hidden">
      
      {showNotifications && (
        <NotificationCenter 
          notifications={notifications} 
          currentRole={activeRole} 
          onClose={() => setShowNotifications(false)} 
          onMarkRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))}
          onClearAll={() => setNotifications([])}
        />
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60] px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('dashboard'); }}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg relative">
               <Building2 size={24} />
               {isSyncing && <RefreshCw size={10} className="absolute -bottom-1 -right-1 text-white bg-blue-500 rounded-full animate-spin p-0.5 border border-white" />}
            </div>
            <div className="flex flex-col text-left">
              <h1 className="font-black text-lg tracking-tighter uppercase leading-none text-slate-900">ЗОДЧИЙ</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none italic">v{APP_VERSION}</p>
                {isOnline ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-rose-500" />}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className={`relative p-2.5 rounded-xl transition-all ${showNotifications ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              aria-label="Уведомления"
            >
              <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                </span>
              )}
            </button>
            <span className="text-[9px] font-black uppercase text-blue-600 px-2 py-1.5 bg-blue-50 rounded-lg hidden xs:block">{ROLE_LABELS[activeRole]}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden text-slate-900">
        {/* ОТРИСОВКА ЗАДАЧИ: ПЕРВООЧЕРЕДНОЙ ПРИОРИТЕТ */}
        {selectedTaskId !== null && activeTask ? (
          <TaskDetails 
            task={activeTask} 
            role={activeRole} 
            onClose={() => setSelectedTaskId(null)} 
            onStatusChange={(tid, ns, ev, com) => {
              setTasks(prev => prev.map(t => t.id === tid ? { ...t, status: ns, supervisorComment: com || t.supervisorComment, updatedAt: new Date().toISOString() } : t));
              if (ns === TaskStatus.REVIEW) addNotification('review', currentProject?.name || 'Объект', activeTask.title, 'Работа сдана на проверку.', UserRole.SUPERVISOR);
              if (ns === TaskStatus.DONE) addNotification('done', currentProject?.name || 'Объект', activeTask.title, 'Работа принята технадзором.', UserRole.FOREMAN);
              if (ns === TaskStatus.REWORK) addNotification('rework', currentProject?.name || 'Объект', activeTask.title, 'Требуется доработка по замечаниям.', UserRole.FOREMAN);
            }} 
            onAddComment={(tid, text) => {
              const c: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text, createdAt: new Date().toISOString() };
              setTasks(prev => prev.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), c], updatedAt: new Date().toISOString() } : t));
            }} 
            onAddEvidence={(tid, file) => {
               const r = new FileReader(); r.onloadend = () => {
                 setTasks(prev => prev.map(t => t.id === tid ? { ...t, evidenceUrls: [...t.evidenceUrls, r.result as string], evidenceCount: t.evidenceCount + 1, updatedAt: new Date().toISOString() } : t));
               }; r.readAsDataURL(file);
            }}
            onUpdateTask={(ut) => setTasks(prev => prev.map(t => t.id === ut.id ? { ...ut, updatedAt: new Date().toISOString() } : t))}
          />
        ) : selectedProjectId && currentProject ? (
          <ProjectView 
            project={currentProject}
            tasks={filteredTasks}
            currentUser={currentUser}
            activeRole={activeRole}
            onBack={() => setSelectedProjectId(null)}
            onEdit={(p) => { setProjectEditForm({...p}); setProjectEditMode(true); setShowProjectForm(true); }}
            onAddTask={() => setShowTaskForm(true)}
            onSelectTask={(tid) => setSelectedTaskId(tid)}
            onSendMessage={(t) => {
              const nc: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text: t, createdAt: new Date().toISOString() };
              setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, comments: [...(p.comments || []), nc], updatedAt: new Date().toISOString() } : p));
            }}
            onAddFile={(pid, f, cat) => {
              const r = new FileReader(); r.onloadend = () => {
                const nf: ProjectFile = { name: f.name, url: r.result as string, category: cat, createdAt: new Date().toISOString() };
                setProjects(prev => prev.map(p => p.id === pid ? { ...p, fileLinks: [...(p.fileLinks || []), nf], updatedAt: new Date().toISOString() } : p));
              }; r.readAsDataURL(f);
            }}
          />
        ) : activeTab === 'tasks' ? (
          <div className="space-y-6">
             <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest text-left">Все задачи ({tasks.length})</h2>
             <div className="grid gap-3 text-left">
               {tasks.map(t => (
                 <div key={t.id} onClick={() => { setSelectedProjectId(t.projectId); setSelectedTaskId(t.id); }} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all">
                    <div className="truncate">
                      <h4 className="font-black text-slate-900 text-sm truncate uppercase">{t.title}</h4>
                      <p className="text-[9px] font-black uppercase text-blue-600 mt-1 italic">Объект: {projects.find(p => p.id === t.projectId)?.name || 'Неизвестен'}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-600 transition-all" />
                 </div>
               ))}
             </div>
          </div>
        ) : activeTab === 'admin' ? (
          <AdminPanel users={users} onUpdateUsers={setUsers} currentUser={currentUser!} activeRole={activeRole} onRoleSwitch={setActiveRole} />
        ) : activeTab === 'backup' ? (
          <BackupManager currentUser={currentUser} onDataImport={(d) => { if(d.projects) setProjects(d.projects); if(d.tasks) setTasks(d.tasks); if(d.users) setUsers(d.users); }} />
        ) : (
          <div className="space-y-6 animate-in fade-in">
            {activeTab === 'profile' ? (
               <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 text-center space-y-6 shadow-sm border border-slate-100">
                  <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto text-2xl font-black shadow-xl border-4 border-white">{currentUser?.username[0].toUpperCase()}</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{currentUser?.username}</h3>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{ROLE_LABELS[activeRole]}</p>
                  </div>
                  <button onClick={() => { setCurrentUser(null); localStorage.removeItem(STORAGE_KEYS.AUTH_USER); }} className="w-full bg-slate-50 text-slate-500 font-black py-5 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 border border-slate-100"><LogOut size={18} /> Выйти</button>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-left">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Системные настройки</h4>
                   <button onClick={() => performSync()} className="w-full bg-blue-50 text-blue-600 font-black py-5 rounded-2xl uppercase text-[10px] flex items-center justify-center gap-3 active:scale-95 border border-blue-100 mb-3"><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> Синхронизировать</button>
                   <p className="text-[8px] text-center text-slate-400 uppercase mt-2">Версия ПО: {APP_VERSION}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest text-left">Объекты ({projects.length})</h2>
                  {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                    <button onClick={() => { setProjectEditMode(false); setProjectEditForm({}); setShowProjectForm(true); }} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all">
                      <Plus size={20} />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 text-left">
                  {projects.map(p => (
                    <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group">
                      <div className="flex items-center gap-4 truncate">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <MapPin size={20} />
                        </div>
                        <div className="truncate">
                          <h4 className="font-black text-slate-900 text-sm truncate uppercase">{p.name}</h4>
                          <p className="text-[9px] font-bold text-slate-500 uppercase truncate">{p.address}</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-200 shrink-0" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ФОРМЫ */}
      {showProjectForm && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <form onSubmit={handleSaveProject} className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{projectEditMode ? 'Редактировать объект' : 'Новый объект'}</h3>
              <button type="button" onClick={() => setShowProjectForm(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Название объекта</label><input required value={projectEditForm.name || ''} onChange={e => setProjectEditForm({...projectEditForm, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900" placeholder="Название"/></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Адрес объекта</label><input required value={projectEditForm.address || ''} onChange={e => setProjectEditForm({...projectEditForm, address: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900" placeholder="г. Камчатка..."/></div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"><Save size={18} /> Сохранить объект</button>
            </div>
          </form>
        </div>
      )}

      {showTaskForm && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <form onSubmit={handleSaveTask} className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 border border-slate-100">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white z-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Добавить задачу</h3>
              <button type="button" onClick={() => setShowTaskForm(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Название задачи</label><input required value={taskEditForm.title || ''} onChange={e => setTaskEditForm({...taskEditForm, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900" placeholder="Например: Монтаж..."/></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Техническое задание</label><textarea required value={taskEditForm.description || ''} onChange={e => setTaskEditForm({...taskEditForm, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 min-h-[120px]" placeholder="Детали выполнения..."/></div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-blue-100">
                <FilePlus size={18} /> Создать задачу
              </button>
            </div>
          </form>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-[70] w-full max-w-2xl mx-auto rounded-t-3xl shadow-2xl safe-area-bottom">
        <div className="flex justify-around items-center py-4 px-2">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
            <LayoutGrid size={22} /><span className="text-[7px] font-black uppercase">Объекты</span>
          </button>
          <button onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'tasks' ? 'text-blue-600' : 'text-slate-400'}`}>
            <CheckSquare size={22} /><span className="text-[7px] font-black uppercase">Задачи</span>
          </button>
          {activeRole === UserRole.ADMIN && (
            <>
              <button onClick={() => { setActiveTab('admin'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}>
                <Users size={22} /><span className="text-[7px] font-black uppercase">Команда</span>
              </button>
              <button onClick={() => { setActiveTab('backup'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'backup' ? 'text-blue-600' : 'text-slate-400'}`}>
                <Cloud size={22} /><span className="text-[7px] font-black uppercase">Облако</span>
              </button>
            </>
          )}
          <button onClick={() => { setActiveTab('profile'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}>
            <UserCircle size={22} /><span className="text-[7px] font-black uppercase">Профиль</span>
          </button>
        </div>
      </nav>

      <AIAssistant projectContext={currentProject ? `Объект: ${currentProject.name}.` : 'Обзор системы.'} />
    </div>
  );
};

export default App;
