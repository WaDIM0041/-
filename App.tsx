
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserRole, Task, TaskStatus, Project, User, ProjectStatus, ROLE_LABELS, AppNotification, Comment, ProjectFile, FileCategory, GlobalChatMessage, TASK_STATUS_LABELS } from './types.ts';
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

// Единые ключи хранилища для всего приложения (Стандарт v7.1)
export const STORAGE_KEYS = {
  PROJECTS: 'zodchiy_projects_v7',
  TASKS: 'zodchiy_tasks_v7',
  USERS: 'zodchiy_users_v7',
  AUTH_USER: 'zodchiy_auth_v7'
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
  },
  {
    id: 2,
    name: 'ЖК "Аврора" - Корпус 1',
    description: 'Возведение монолитного каркаса и кирпичная кладка.',
    clientFullName: 'ООО СтройТех',
    city: 'Петропавловск-Камчатский',
    street: 'Северо-Восточное шоссе, 12',
    phone: '8 800 555 35 35',
    telegram: '@avrora_build',
    address: 'Петропавловск-Камчатский, ул. Северо-Восточное шоссе, 12',
    geoLocation: { lat: 53.05, lon: 158.65 },
    fileLinks: [],
    progress: 45,
    status: ProjectStatus.IN_PROGRESS,
    comments: []
  }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 101,
    projectId: 1,
    title: 'Армирование пояса',
    description: 'Вязание арматуры 12мм согласно проекту КЖ-2.',
    status: TaskStatus.IN_PROGRESS,
    evidenceUrls: [],
    evidenceCount: 0,
    comments: []
  },
  {
    id: 102,
    projectId: 1,
    title: 'Заливка фундамента',
    description: 'Бетон М350. Требуется вибрирование.',
    status: TaskStatus.DONE,
    evidenceUrls: [],
    evidenceCount: 0,
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'admin' | 'backup' | 'profile'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState<Partial<Project>>({});
  const [taskEditForm, setTaskEditForm] = useState<Partial<Task>>({ title: '', description: '' });
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileCategory, setPendingFileCategory] = useState<FileCategory>(FileCategory.DOCUMENT);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [projects, tasks, users]);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const filteredTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProjectId), [tasks, selectedProjectId]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setActiveTab('dashboard');
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const address = `${projectEditForm.city || ''}, ${projectEditForm.street || ''}`;
    if (editMode && projectEditForm.id) {
      setProjects(prev => prev.map(p => p.id === projectEditForm.id ? { ...p, ...projectEditForm, address } as Project : p));
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
        geoLocation: projectEditForm.geoLocation || { lat: 0, lon: 0 },
        fileLinks: [],
        progress: 0,
        status: ProjectStatus.NEW,
        comments: []
      };
      setProjects(prev => [...prev, newP]);
    }
    setShowProjectForm(false);
    setProjectEditForm({});
  };

  const handleSaveTask = (e: React.FormEvent) => {
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
    setTasks(prev => [...prev, newT]);
    setShowTaskForm(false);
    setTaskEditForm({ title: '', description: '' });
  };

  const handleStatusChange = (taskId: number, newStatus: TaskStatus, evidence?: File, comment?: string) => {
    if (evidence) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTasks(prev => prev.map(t => t.id === taskId ? { 
          ...t, 
          status: newStatus, 
          supervisorComment: comment || t.supervisorComment,
          evidenceUrls: [...t.evidenceUrls, reader.result as string],
          evidenceCount: t.evidenceCount + 1
        } : t));
      };
      reader.readAsDataURL(evidence);
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, supervisorComment: comment || t.supervisorComment } : t));
    }
  };

  const handleAddProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    const url: string = await new Promise((res) => {
      const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(file);
    });
    const newFile: ProjectFile = { name: file.name, url, category: pendingFileCategory, createdAt: new Date().toISOString() };
    setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, fileLinks: [...p.fileLinks, newFile] } : p));
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-24 flex flex-col max-w-2xl mx-auto bg-slate-50 shadow-sm relative">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); setActiveTab('dashboard'); }}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
               <Building2 size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none">ЗОДЧИЙ</h1>
              <div className="flex items-center gap-1 mt-1">
                <Wifi size={10} className="text-emerald-500" />
                <span className="text-[8px] font-black uppercase text-emerald-500">Система активна</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">{ROLE_LABELS[activeRole]}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-x-hidden">
        {activeTab === 'dashboard' && !selectedProjectId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Объекты ({projects.length})</h2>
              {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                <button onClick={() => { setEditMode(false); setShowProjectForm(true); }} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="grid gap-3">
              {projects.map(p => (
                <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-all group">
                  <div className="flex items-center gap-5 overflow-hidden">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <MapPin size={24} />
                    </div>
                    <div className="truncate">
                      <h4 className="font-black text-slate-800 text-base truncate">{p.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">{p.address}</p>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-200 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
             <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Все задачи ({tasks.length})</h2>
             <div className="grid gap-3">
               {tasks.map(t => (
                 <div key={t.id} onClick={() => { 
                   setSelectedProjectId(t.projectId); 
                   setSelectedTaskId(t.id);
                 }}>
                   <TaskCard task={t} role={activeRole} onStatusChange={() => {}} onAddComment={() => {}} />
                   <p className="text-[9px] font-black uppercase text-blue-600 ml-6 -mt-2 mb-2 italic">Объект: {projects.find(p => p.id === t.projectId)?.name}</p>
                 </div>
               ))}
             </div>
          </div>
        )}

        {selectedProjectId && currentProject && !selectedTaskId && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedProjectId(null)} className="text-slate-500 font-black text-[11px] uppercase flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
                <ChevronRight className="rotate-180" size={18}/> Назад
              </button>
              <div className="flex gap-2">
                {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                  <>
                    <button onClick={() => { setProjectEditForm(currentProject); setEditMode(true); setShowProjectForm(true); }} className="p-3 bg-white text-blue-600 rounded-xl border border-slate-100 shadow-sm"><Pencil size={20}/></button>
                    <button onClick={() => { if(window.confirm('Удалить объект?')) { setProjects(prev => prev.filter(p => p.id !== currentProject.id)); setSelectedProjectId(null); }}} className="p-3 bg-white text-rose-500 rounded-xl border border-slate-100 shadow-sm"><Trash2 size={20}/></button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Building2 size={32} /></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-black text-slate-800 leading-tight">{currentProject.name}</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{currentProject.address}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Прогресс объекта</span>
                      <span className="text-[10px] font-black text-blue-600">{currentProject.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${currentProject.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <a href={`tel:${currentProject.phone}`} className="flex flex-col items-center justify-center gap-2 p-4 bg-green-600 text-white rounded-2xl border border-green-700 hover:bg-green-700 transition-all group shadow-lg shadow-green-100/50">
                  <div className="p-2 bg-white/20 rounded-xl text-white shadow-sm"><Phone size={18} /></div>
                  <span className="text-[14px] font-black uppercase tracking-tighter drop-shadow-sm">{currentProject.phone}</span>
                </a>
                <a href={`https://t.me/${currentProject.telegram.replace('@', '')}`} target="_blank" className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-2xl border border-blue-700 hover:bg-blue-700 transition-all group shadow-lg shadow-blue-100/50">
                  <div className="p-2 bg-white/20 rounded-xl text-white shadow-sm"><Send size={18} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Telegram</span>
                </a>
                <a href={`https://yandex.ru/maps/?text=${encodeURIComponent(currentProject.address)}`} target="_blank" className="flex flex-col items-center justify-center gap-2 p-4 bg-red-600 text-white rounded-2xl border border-red-700 hover:bg-red-700 transition-all group shadow-lg shadow-red-100/50">
                  <div className="p-2 bg-white/20 rounded-xl text-white shadow-sm"><Navigation size={18} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Локация</span>
                </a>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Документация</h4>
                  <div className="flex gap-2">
                     <input type="file" ref={projectFileInputRef} className="hidden" onChange={handleAddProjectFile} />
                     <button onClick={() => { setPendingFileCategory(FileCategory.DRAWING); projectFileInputRef.current?.click(); }} className="p-2.5 bg-amber-50 text-amber-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase"><Paperclip size={14} /> Чертеж</button>
                     <button onClick={() => { setPendingFileCategory(FileCategory.DOCUMENT); projectFileInputRef.current?.click(); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase"><FileCheck size={14} /> Документ</button>
                  </div>
                </div>
                <div className="grid gap-2">
                  {currentProject.fileLinks.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                      <div className="flex items-center gap-4 cursor-pointer truncate flex-1" onClick={() => setPreviewFile(f)}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.category === FileCategory.DRAWING ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          <FileText size={20}/>
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-black text-slate-700 truncate">{f.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{f.category === FileCategory.DRAWING ? 'Чертеж' : 'Документация'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-8 border-t border-slate-50 pt-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Чат объекта</h4>
                <ProjectChat messages={currentProject.comments || []} currentUser={currentUser} currentRole={activeRole} onSendMessage={(t) => {
                  const newComment: Comment = { id: Date.now(), author: currentUser.username, role: activeRole, text: t, createdAt: new Date().toISOString() };
                  setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, comments: [...(p.comments || []), newComment] } : p));
                }} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">План работ ({filteredTasks.length})</h4>
                  {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                    <button onClick={() => setShowTaskForm(true)} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><Plus size={18} /></button>
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
              setTasks(prev => prev.map(t => t.id === tid ? { ...t, comments: [...(t.comments || []), c] } : t));
            }}
            onAddEvidence={(tid, file) => {
               const r = new FileReader(); r.onloadend = () => {
                 setTasks(prev => prev.map(t => t.id === tid ? { ...t, evidenceUrls: [...t.evidenceUrls, r.result as string], evidenceCount: t.evidenceCount + 1 } : t));
               }; r.readAsDataURL(file);
            }}
            onUpdateTask={(ut) => setTasks(prev => prev.map(t => t.id === ut.id ? ut : t))}
          />
        )}

        {activeTab === 'admin' && <AdminPanel users={users} onUpdateUsers={setUsers} currentUser={currentUser!} activeRole={activeRole} onRoleSwitch={setActiveRole} />}
        {activeTab === 'backup' && <BackupManager currentUser={currentUser} onDataImport={(d) => { if(d.projects) setProjects(d.projects); if(d.tasks) setTasks(d.tasks); if(d.users) setUsers(d.users); }} />}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-[2.5rem] p-10 text-center space-y-8 animate-in slide-in-from-bottom-4 shadow-sm border border-slate-100">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto text-3xl font-black shadow-xl shadow-blue-100 border-4 border-white">{currentUser?.username[0].toUpperCase()}</div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{currentUser?.username}</h3>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{ROLE_LABELS[activeRole]}</p>
            </div>
            <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-black py-6 rounded-2xl uppercase text-[11px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm border border-rose-100"><LogOut size={20} /> Выйти из аккаунта</button>
          </div>
        )}
      </main>

      {/* Modals */}
      {showProjectForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 relative">
            <button onClick={() => setShowProjectForm(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={24}/></button>
            <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">{editMode ? 'Редактировать объект' : 'Новый объект строительства'}</h3>
            <form onSubmit={handleSaveProject} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Название объекта</label>
                <input required placeholder="Например: Дом в Елизово" value={projectEditForm.name || ''} onChange={e => setProjectEditForm({...projectEditForm, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 border border-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Город</label>
                  <input required placeholder="Елизово" value={projectEditForm.city || ''} onChange={e => setProjectEditForm({...projectEditForm, city: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 border border-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Улица, дом</label>
                  <input required placeholder="Магистральная, 42" value={projectEditForm.street || ''} onChange={e => setProjectEditForm({...projectEditForm, street: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 border border-slate-100" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl uppercase tracking-widest text-[11px] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Сохранить изменения</button>
            </form>
          </div>
        </div>
      )}

      {showTaskForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
            <button onClick={() => setShowTaskForm(false)} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-800 transition-colors"><X size={24}/></button>
            <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">Постановка новой задачи</h3>
            <form onSubmit={handleSaveTask} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Суть работы</label>
                <input required placeholder="Например: Монтаж стропильной системы" value={taskEditForm.title} onChange={e => setTaskEditForm({...taskEditForm, title: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-slate-700 border border-slate-100 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Детальное описание / ТТ</label>
                <textarea placeholder="Опишите требования, материалы, сроки..." value={taskEditForm.description} onChange={e => setTaskEditForm({...taskEditForm, description: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-slate-700 min-h-[140px] border border-slate-100 outline-none" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl uppercase text-[11px] shadow-xl shadow-blue-100">Добавить в план</button>
            </form>
          </div>
        </div>
      )}

      {previewFile && <FilePreviewer url={previewFile.url} name={previewFile.name} category={previewFile.category} onClose={() => setPreviewFile(null)} />}
      
      {currentUser && (
        <AIAssistant projectContext={currentProject ? `Объект: ${currentProject.name}. Адрес: ${currentProject.address}. Задач: ${filteredTasks.length}` : 'Общий обзор системы'} />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-50 max-w-2xl mx-auto rounded-t-[2.5rem] shadow-2xl safe-area-bottom">
        <div className="flex justify-around items-center py-6 px-4">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-300'}`}>
            <LayoutGrid size={24} strokeWidth={activeTab === 'dashboard' ? 3 : 2} /><span className="text-[8px] font-black uppercase">Объекты</span>
          </button>
          <button onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); setSelectedTaskId(null); }} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'tasks' ? 'text-blue-600' : 'text-slate-300'}`}>
            <CheckSquare size={24} strokeWidth={activeTab === 'tasks' ? 3 : 2} /><span className="text-[8px] font-black uppercase">Задачи</span>
          </button>
          {activeRole === UserRole.ADMIN && (
            <>
              <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-300'}`}>
                <Users size={24} strokeWidth={activeTab === 'admin' ? 3 : 2} /><span className="text-[8px] font-black uppercase">Персонал</span>
              </button>
              <button onClick={() => setActiveTab('backup')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'backup' ? 'text-blue-600' : 'text-slate-300'}`}>
                <Cloud size={24} strokeWidth={activeTab === 'backup' ? 3 : 2} /><span className="text-[8px] font-black uppercase">Облако</span>
              </button>
            </>
          )}
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-300'}`}>
            <UserCircle size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[8px] font-black uppercase">Профиль</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
