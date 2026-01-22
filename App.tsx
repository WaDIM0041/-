import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UserRole, Task, TaskStatus, Project, User, ProjectStatus, 
  ROLE_LABELS, APP_VERSION, AppNotification, AppSnapshot, FileCategory, GithubConfig, InvitePayload, GlobalChatMessage, Comment, ProjectFile 
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
  Cloud,
  Wifi,
  X,
  MessageSquare,
  Settings,
  Plus,
  ShieldCheck,
  Building2,
  Save
} from 'lucide-react';

// ФИКСИРОВАННЫЕ КЛЮЧИ ХРАНИЛИЩА (НИКОГДА НЕ МЕНЯТЬ)
export const STORAGE_KEYS = {
  MASTER_STATE: 'zodchiy_enterprise_database_stable_v1',
  AUTH_USER: 'zodchiy_auth_session_stable_v1',
  GH_CONFIG: 'zodchiy_cloud_config_stable_v1',
  EMERGENCY_BACKUP: 'zodchiy_emergency_backup_v1'
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser?.role || UserRole.ADMIN);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [db, setDb] = useState<AppSnapshot>(() => {
    // 1. Попытка загрузить основную базу
    const saved = localStorage.getItem(STORAGE_KEYS.MASTER_STATE);
    const backup = localStorage.getItem(STORAGE_KEYS.EMERGENCY_BACKUP);
    const rawData = saved || backup;

    try {
      if (rawData) {
        const parsed = JSON.parse(rawData);
        // Если база существует, просто обновляем версию в объекте, не затирая данные
        if (parsed.projects && Array.isArray(parsed.projects)) {
          return { ...parsed, version: APP_VERSION };
        }
      }
      
      // 2. Если базы нет совсем (первый запуск), создаем демо-данные
      const defaultProjectId = Date.now();
      return {
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        projects: [
          {
            id: defaultProjectId,
            name: "ЖК «ВЕРТИКАЛЬ»",
            description: "Строительство жилого комплекса премиум-класса. Текущий этап: монолитные работы и инженерные сети.",
            clientFullName: "ГК 'Основа'",
            city: "Москва",
            street: "ул. Новаторов, 4",
            phone: "+7 (900) 123-45-67",
            telegram: "@vertikal_stroy",
            address: "Москва, ул. Новаторов, д. 4",
            geoLocation: { lat: 55.666, lon: 37.525 },
            fileLinks: [],
            progress: 42,
            status: ProjectStatus.IN_PROGRESS,
            comments: [],
            updatedAt: new Date().toISOString()
          }
        ],
        tasks: [
          {
            id: 1,
            projectId: defaultProjectId,
            title: "Бетонирование плиты перекрытия 5 этажа",
            description: "Прием бетона марки B25. Проверка армирования и опалубки.",
            status: TaskStatus.IN_PROGRESS,
            evidenceUrls: [],
            evidenceCount: 0,
            comments: [],
            updatedAt: new Date().toISOString()
          }
        ],
        users: [
          { id: 1, username: 'Администратор', role: UserRole.ADMIN, password: '123' },
          { id: 2, username: 'Прораб Иванов', role: UserRole.FOREMAN, password: '123' },
          { id: 3, username: 'Технадзор Петров', role: UserRole.SUPERVISOR, password: '123' }
        ],
        notifications: [],
        chatMessages: []
      };
    } catch (e) { 
      console.error("Critical: Data restore failed", e);
      // В случае фатальной ошибки парсинга возвращаем пустую структуру, 
      // но НЕ затираем localStorage, чтобы можно было восстановить вручную
      return { version: APP_VERSION, timestamp: new Date().toISOString(), projects: [], tasks: [], users: [], notifications: [], chatMessages: [] }; 
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'admin' | 'settings'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // ГАРАНТИРОВАННОЕ СОХРАНЕНИЕ
  const handleUpdateDB = useCallback((updater: (prev: AppSnapshot) => AppSnapshot) => {
    setDb(prev => {
      const next = updater(prev);
      next.timestamp = new Date().toISOString();
      try {
        const serialized = JSON.stringify(next);
        localStorage.setItem(STORAGE_KEYS.MASTER_STATE, serialized);
        localStorage.setItem(STORAGE_KEYS.EMERGENCY_BACKUP, serialized); // Дубликат для безопасности
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          alert("Критическая ошибка: Память браузера переполнена! Удалите старые фото из задач.");
        }
      }
      return next;
    });
  }, []);

  const handleRefreshApp = () => {
    setIsRefreshing(true);
    // Принудительно сохраняем текущее состояние перед релоадом
    handleUpdateDB(prev => prev);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleGoHome = useCallback(() => {
    setActiveTab('dashboard');
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setIsAddingProject(false);
    setEditingProject(null);
    setShowNotifications(false);
  }, []);

  // БИЗНЕС-ЛОГИКА
  const addProject = (p: Partial<Project>) => {
    const newProject: Project = {
      id: Date.now(),
      name: p.name || 'Новый объект',
      description: p.description || '',
      clientFullName: p.clientFullName || '',
      city: p.city || '',
      street: p.street || '',
      phone: p.phone || '',
      telegram: p.telegram || '',
      address: `${p.city}, ${p.street}`,
      geoLocation: { lat: 0, lon: 0 },
      fileLinks: [],
      progress: 0,
      status: ProjectStatus.NEW,
      comments: [],
      updatedAt: new Date().toISOString()
    };
    handleUpdateDB(prev => ({ ...prev, projects: [newProject, ...prev.projects] }));
    setIsAddingProject(false);
    setSelectedProjectId(newProject.id);
  };

  const updateProject = (p: Project) => {
    handleUpdateDB(prev => ({
      ...prev,
      projects: prev.projects.map(item => item.id === p.id ? p : item)
    }));
    setEditingProject(null);
  };

  const addProjectFile = async (projectId: number, file: File, category: FileCategory) => {
    try {
      setIsProcessingFile(true);
      const base64 = await fileToBase64(file);
      const newFile: ProjectFile = {
        name: file.name,
        url: base64,
        category: category,
        createdAt: new Date().toISOString()
      };

      handleUpdateDB(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === projectId ? {
          ...p,
          fileLinks: [...(p.fileLinks || []), newFile]
        } : p)
      }));
    } catch (e) {
      console.error("File processing error", e);
      alert("Ошибка при сохранении файла. Память переполнена.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const addTask = (projectId: number) => {
    const newTask: Task = {
      id: Date.now(),
      projectId,
      title: 'Новая задача',
      description: 'Описание работ...',
      status: TaskStatus.TODO,
      evidenceUrls: [],
      evidenceCount: 0,
      comments: [],
      updatedAt: new Date().toISOString()
    };
    handleUpdateDB(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    setSelectedTaskId(newTask.id);
  };

  const updateTaskStatus = async (taskId: number, newStatus: TaskStatus, evidenceFile?: File, comment?: string) => {
    let evidenceUrl: string | null = null;
    if (evidenceFile) {
      try {
        setIsProcessingFile(true);
        evidenceUrl = await fileToBase64(evidenceFile);
      } catch (e) {
        console.error("Evidence processing error", e);
      } finally {
        setIsProcessingFile(false);
      }
    }

    handleUpdateDB(prev => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task) return prev;
      
      const project = prev.projects.find(p => p.id === task.projectId);
      
      const updatedTask: Task = {
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        evidenceUrls: evidenceUrl ? [...task.evidenceUrls, evidenceUrl] : task.evidenceUrls,
        evidenceCount: evidenceUrl ? task.evidenceCount + 1 : task.evidenceCount,
        supervisorComment: comment || task.supervisorComment
      };

      const newNotif: AppNotification = {
        id: Date.now(),
        type: newStatus === TaskStatus.REVIEW ? 'review' : newStatus === TaskStatus.REWORK ? 'rework' : 'done',
        projectTitle: project?.name || 'Объект',
        taskTitle: task.title,
        message: comment || `Статус изменен на ${newStatus}`,
        targetRole: newStatus === TaskStatus.REVIEW ? UserRole.SUPERVISOR : UserRole.FOREMAN,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? updatedTask : t),
        notifications: [newNotif, ...prev.notifications].slice(0, 50)
      };
    });
  };

  const updateTaskDetails = (updatedTask: Task) => {
    handleUpdateDB(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    }));
  };

  const addComment = (taskId: number, text: string) => {
    const newComment: Comment = {
      id: Date.now(),
      author: currentUser?.username || 'Система',
      role: activeRole,
      text,
      createdAt: new Date().toISOString()
    };
    handleUpdateDB(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, comments: [...(t.comments || []), newComment] } : t)
    }));
  };

  const addProjectComment = (projectId: number, text: string) => {
    const newComment: Comment = {
      id: Date.now(),
      author: currentUser?.username || 'Система',
      role: activeRole,
      text,
      createdAt: new Date().toISOString()
    };
    handleUpdateDB(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === projectId ? { ...p, comments: [...(p.comments || []), newComment] } : p)
    }));
  };

  const sendGlobalMessage = (text: string) => {
    const msg: GlobalChatMessage = {
      id: Date.now(),
      userId: currentUser?.id || 0,
      username: currentUser?.username || 'User',
      role: activeRole,
      text,
      createdAt: new Date().toISOString()
    };
    handleUpdateDB(prev => ({ ...prev, chatMessages: [...(prev.chatMessages || []), msg] }));
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    setCurrentUser(null);
  };

  // РЕНДЕРИНГ
  const selectedProject = db.projects.find(p => p.id === selectedProjectId);
  const selectedTask = db.tasks.find(t => t.id === selectedTaskId);

  if (!currentUser) {
    return (
      <LoginPage 
        users={db.users} 
        onLogin={(user) => {
          setCurrentUser(user);
          setActiveRole(user.role);
          localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
        }}
        onApplyInvite={() => false}
      />
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${activeRole === UserRole.ADMIN ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      {(isProcessingFile || isRefreshing) && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <RefreshCw className="text-blue-600 animate-spin" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
              {isRefreshing ? 'Фиксация данных и обновление...' : 'Обработка данных...'}
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-md ${activeRole === UserRole.ADMIN ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <button 
          onClick={handleGoHome}
          title="Домой"
          className="flex items-center gap-3 active:scale-95 transition-all text-left group cursor-pointer"
        >
          <Logo size={32} isMaster={activeRole === UserRole.ADMIN} className="group-hover:rotate-12 transition-transform" />
          <div>
            <h1 className={`text-xs font-black uppercase tracking-widest leading-none ${activeRole === UserRole.ADMIN ? 'text-white' : 'text-slate-900'}`}>Зодчий</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${activeRole === UserRole.ADMIN ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                {ROLE_LABELS[activeRole]}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <Wifi size={14} className={syncError ? 'text-rose-500' : 'text-emerald-500'} />
            <Cloud size={14} className={isSyncing ? 'text-blue-500 animate-pulse' : 'text-slate-300'} />
          </div>
          
          <button 
            onClick={handleRefreshApp}
            title="Обновить приложение"
            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-90 transition-all hover:bg-blue-600 hover:text-white group"
          >
            <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
          </button>

          <button onClick={() => setShowNotifications(true)} className="relative p-2.5 bg-slate-100 rounded-xl text-slate-500 active:scale-90 transition-all">
            <Bell size={18} />
            {db.notifications.some(n => !n.isRead) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            )}
          </button>
          
          <button onClick={handleLogout} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl active:scale-90 transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
        {selectedTaskId && selectedTask ? (
          <TaskDetails 
            task={selectedTask} 
            role={activeRole} 
            isAdmin={activeRole === UserRole.ADMIN}
            onClose={() => setSelectedTaskId(null)}
            onStatusChange={updateTaskStatus}
            onAddComment={addComment}
            onAddEvidence={(tid, file) => updateTaskStatus(tid, selectedTask.status, file)}
            onUpdateTask={updateTaskDetails}
          />
        ) : selectedProjectId && selectedProject ? (
          <ProjectView 
            project={selectedProject}
            tasks={db.tasks.filter(t => t.projectId === selectedProjectId)}
            currentUser={currentUser!}
            activeRole={activeRole}
            onBack={() => setSelectedProjectId(null)}
            onEdit={setEditingProject}
            onAddTask={() => addTask(selectedProjectId)}
            onSelectTask={setSelectedTaskId}
            onSendMessage={(txt) => addProjectComment(selectedProjectId, txt)}
            onAddFile={addProjectFile}
          />
        ) : editingProject ? (
          <ProjectForm project={editingProject} onSave={updateProject} onCancel={() => setEditingProject(null)} />
        ) : isAddingProject ? (
          <ProjectForm project={{} as Project} onSave={addProject} onCancel={() => setIsAddingProject(false)} />
        ) : (
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-sm font-black uppercase tracking-widest ${activeRole === UserRole.ADMIN ? 'text-slate-400' : 'text-slate-500'}`}>Объекты в работе</h2>
                  {(activeRole === UserRole.ADMIN || activeRole === UserRole.MANAGER) && (
                    <button onClick={() => setIsAddingProject(true)} className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all">
                      <Plus size={20} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {db.projects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedProjectId(p.id)}
                      className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-500 hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Building2 size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-black text-slate-800 leading-tight truncate uppercase">{p.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter mt-1">{p.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-300 uppercase">Прогресс</span>
                          <span className="text-sm font-black text-blue-600">{p.progress}%</span>
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">
                            {p.fileLinks?.length || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <GlobalChat 
                messages={db.chatMessages || []} 
                currentUser={currentUser!} 
                currentRole={activeRole} 
                onSendMessage={sendGlobalMessage} 
              />
            )}

            {activeTab === 'admin' && activeRole === UserRole.ADMIN && (
              <AdminPanel 
                users={db.users} 
                onUpdateUsers={(users) => handleUpdateDB(prev => ({ ...prev, users }))} 
                currentUser={currentUser!} 
                activeRole={activeRole} 
                onRoleSwitch={setActiveRole} 
              />
            )}

            {activeTab === 'settings' && (
              <BackupManager 
                currentUser={currentUser} 
                currentDb={db} 
                onDataImport={(data) => handleUpdateDB(() => data)} 
              />
            )}
          </div>
        )}
      </main>

      {/* BOTTOM NAV */}
      {!selectedProjectId && !selectedTaskId && !isAddingProject && !editingProject && (
        <nav className={`fixed bottom-0 left-0 right-0 p-4 pb-8 border-t flex items-center justify-around backdrop-blur-lg z-50 ${activeRole === UserRole.ADMIN ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'text-blue-500 scale-110' : 'text-slate-400'}`}>
            <LayoutGrid size={22} />
            <span className="text-[8px] font-black uppercase tracking-widest">Объекты</span>
          </button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'chat' ? 'text-indigo-500 scale-110' : 'text-slate-400'}`}>
            <MessageSquare size={22} />
            <span className="text-[8px] font-black uppercase tracking-widest">Команда</span>
          </button>
          {activeRole === UserRole.ADMIN && (
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-amber-500 scale-110' : 'text-slate-400'}`}>
              <ShieldCheck size={22} />
              <span className="text-[8px] font-black uppercase tracking-widest">Админ</span>
            </button>
          )}
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'text-slate-600 scale-110' : 'text-slate-400'}`}>
            <Settings size={22} />
            <span className="text-[8px] font-black uppercase tracking-widest">Настройки</span>
          </button>
        </nav>
      )}

      {/* OVERLAYS */}
      {showNotifications && (
        <NotificationCenter 
          notifications={db.notifications} 
          currentRole={activeRole} 
          onClose={() => setShowNotifications(false)} 
          onMarkRead={(id) => handleUpdateDB(prev => ({ 
            ...prev, 
            notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) 
          }))}
          onClearAll={() => handleUpdateDB(prev => ({ ...prev, notifications: [] }))}
        />
      )}

      {selectedProjectId && (
        <AIAssistant projectContext={`Проект: ${selectedProject?.name}. Описание: ${selectedProject?.description}. Статус: ${selectedProject?.status}.`} />
      )}
    </div>
  );
};

export default App;