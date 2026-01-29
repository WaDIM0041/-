
import React from 'react';
import { Project, Task, User, UserRole, ROLE_LABELS } from '../types.ts';
import { Building2, ChevronLeft, Phone, Send, ClipboardList, Plus, ChevronRight, MapPin, Settings2, User as UserIcon } from 'lucide-react';
import TaskCard from './TaskCard.tsx';

interface ProjectViewProps {
  project: Project;
  tasks: Task[];
  currentUser: User;
  activeRole: UserRole;
  onBack: () => void;
  onSelectTask: (tid: number) => void;
  onSendMessage: (txt: string) => void;
  onEdit: () => void;
  onAddTask: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  project, 
  tasks, 
  onBack, 
  onSelectTask, 
  activeRole, 
  onEdit,
  onAddTask
}) => {
  const openMap = () => {
    let url = '';
    if (project.lat && project.lon) {
      url = `https://www.google.com/maps/search/?api=1&query=${project.lat},${project.lon}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`;
    }
    window.open(url, '_blank');
  };

  const canEdit = activeRole === UserRole.ADMIN || activeRole === UserRole.HEAD || activeRole === UserRole.MANAGER;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all">
          <ChevronLeft size={16} /> Назад
        </button>
        {canEdit && (
          <button onClick={onEdit} className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100 shadow-sm active:scale-95 transition-all">
            <Settings2 size={16} /> Настроить
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm text-left">
        <div className="flex gap-4 mb-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Building2 size={28} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-slate-900 uppercase leading-tight">{project.name}</h2>
            {project.fullName && (
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-1 flex items-center gap-1">
                <UserIcon size={10} /> {project.fullName}
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-400 mt-1">{project.address}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
            <a href={`tel:${project.phone}`} className="flex flex-col items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 active:scale-95 transition-all shadow-sm">
                <Phone size={18} /> <span className="text-[8px] font-black uppercase">Звонок</span>
            </a>
            <a href={`https://t.me/${project.telegram}`} className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 active:scale-95 transition-all shadow-sm">
                <Send size={18} /> <span className="text-[8px] font-black uppercase">Telegram</span>
            </a>
            <button onClick={openMap} className="flex flex-col items-center justify-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 active:scale-95 transition-all shadow-sm">
                <MapPin size={18} /> <span className="text-[8px] font-black uppercase">Карта</span>
            </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14} /> Работы</h3>
            {activeRole !== UserRole.SUPERVISOR && (
                <button 
                  onClick={onAddTask}
                  className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1 active:scale-95"
                >
                  <Plus size={12} /> Добавить
                </button>
            )}
          </div>
          
          <div className="grid gap-2">
            {tasks.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Список задач пуст</p>
              </div>
            ) : (
              tasks.map(t => (
                <div key={t.id} onClick={() => onSelectTask(t.id)}>
                  <TaskCard 
                    task={t} 
                    role={activeRole} 
                    isAdmin={activeRole === UserRole.ADMIN} 
                    onStatusChange={() => {}} 
                    onAddComment={() => {}} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
