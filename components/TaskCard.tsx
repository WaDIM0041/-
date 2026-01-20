
import React from 'react';
import { Task, TaskStatus, UserRole, TASK_STATUS_LABELS } from '../types.ts';
import { 
  Camera, 
  Play, 
  RotateCcw, 
  Check, 
  ShieldCheck,
  MessageSquare,
  Files,
  ChevronRight
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  role: UserRole;
  isAdmin?: boolean;
  onStatusChange: (newStatus: TaskStatus, evidence?: File, comment?: string) => void;
  onAddComment: (text: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, role, isAdmin = false }) => {
  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'bg-slate-100 text-slate-700 border-slate-200',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
    [TaskStatus.REVIEW]: 'bg-amber-50 text-amber-700 border-amber-200',
    [TaskStatus.DONE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [TaskStatus.REWORK]: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const evidenceList = task.evidenceUrls || [];
  const commentsList = task.comments || [];
  
  return (
    <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 p-4 sm:p-6 mb-3 transition-all active:scale-[0.98] cursor-pointer hover:border-blue-200 group relative overflow-hidden text-left">
      {isAdmin && (
        <div className="absolute top-0 right-0 p-1 bg-blue-600 text-slate-100 rounded-bl-lg shadow-sm z-10">
          <ShieldCheck size={12} className="sm:w-3.5 sm:h-3.5" />
        </div>
      )}

      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <span className={`text-[8px] sm:text-[9px] uppercase font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border ${statusColors[task.status]}`}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
        <div className="flex gap-1.5 sm:gap-2">
          {evidenceList.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 sm:py-1.5 rounded-lg">
              <Files size={10} className="sm:w-3 sm:h-3" /> {evidenceList.length}
            </div>
          )}
          {commentsList.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 sm:py-1.5 rounded-lg">
              <MessageSquare size={10} className="sm:w-3 sm:h-3" /> {commentsList.length}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:gap-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-black text-slate-800 mb-0.5 sm:mb-1 leading-tight tracking-tight truncate group-hover:text-blue-600 transition-colors">{task.title}</h3>
          <p className="text-slate-500 text-[10px] sm:text-[11px] leading-relaxed font-medium line-clamp-1">{task.description}</p>
        </div>
        <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1.5 transition-all shrink-0" />
      </div>

      {task.status === TaskStatus.REWORK && (
        <div className="mt-3 bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex items-center gap-2">
           <RotateCcw size={12} className="text-rose-500 shrink-0 sm:w-3.5 sm:h-3.5" />
           <span className="text-[9px] font-bold text-rose-700 truncate">{task.supervisorComment || 'Замечание технадзора'}</span>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
