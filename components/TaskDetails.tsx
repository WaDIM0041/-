import React, { useRef, useState, useEffect } from 'react';
import { Task, TaskStatus, UserRole, ROLE_LABELS, TASK_STATUS_LABELS, ProjectFile, FileCategory } from '../types.ts';
import { 
  Camera, 
  Play, 
  RotateCcw, 
  Check, 
  Info,
  ShieldCheck,
  FileText,
  MessageSquare,
  SendHorizontal,
  Files,
  X,
  ChevronLeft,
  Calendar,
  ImagePlus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Pencil,
  Save,
  Type
} from 'lucide-react';
import { analyzeConstructionTask } from '../services/aiService.ts';
import { FilePreviewer } from './FilePreviewer.tsx';

interface TaskDetailsProps {
  task: Task;
  role: UserRole;
  isAdmin?: boolean;
  onClose: () => void;
  onStatusChange: (taskId: number, newStatus: TaskStatus, evidence?: File, comment?: string) => void;
  onAddComment: (taskId: number, text: string) => void;
  onAddEvidence: (taskId: number, file: File) => void;
  onUpdateTask?: (updatedTask: Task) => void;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({ 
  task, 
  role, 
  isAdmin = false, 
  onClose, 
  onStatusChange, 
  onAddComment,
  onAddEvidence,
  onUpdateTask
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  
  const [reworkComment, setReworkComment] = useState('');
  const [showReworkInput, setShowReworkInput] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string, index: number} | null>(null);

  // Состояния редактирования информации
  const isNewTask = task.title === 'Новая задача' && task.description === 'Описание работ...';
  const [isEditingInfo, setIsEditingInfo] = useState(isNewTask);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task.comments]);

  useEffect(() => {
    if (isEditingInfo && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isEditingInfo]);

  const canEditInfo = isAdmin || role === UserRole.MANAGER;

  const handleStatusChangeWithFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onStatusChange(task.id, TaskStatus.REVIEW, file);
      if (event.target) event.target.value = '';
    }
  };

  const handleAddEvidenceFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAddEvidence(task.id, file);
      if (event.target) event.target.value = '';
    }
  };

  const handleSendComment = () => {
    if (!newCommentText.trim()) return;
    onAddComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleSaveInfo = () => {
    if (!onUpdateTask) return;
    onUpdateTask({
      ...task,
      title: editedTitle.trim() || task.title,
      description: editedDescription.trim() || task.description,
      updatedAt: new Date().toISOString()
    });
    setIsEditingInfo(false);
  };

  const runAIAudit = async () => {
    if (task.evidenceUrls.length === 0) {
      alert("Для анализа ИИ необходимо наличие фотографий");
      return;
    }
    
    setIsAIAnalyzing(true);
    try {
      const analysis = await analyzeConstructionTask(task.title, task.description, task.evidenceUrls);
      const updatedTask = { ...task, aiAnalysis: analysis };
      if (onUpdateTask) onUpdateTask(updatedTask);
      onAddComment(task.id, `🤖 ЗОДЧИЙ AI: Результат проверки - ${analysis.status.toUpperCase()}. ${analysis.feedback}`);
    } catch (error) {
      console.error("AI Audit failed", error);
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'bg-slate-100 text-slate-700 border-slate-200',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
    [TaskStatus.REVIEW]: 'bg-amber-50 text-amber-700 border-amber-200',
    [TaskStatus.DONE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [TaskStatus.REWORK]: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const canPerformForemanActions = isAdmin || role === UserRole.FOREMAN;
  const canPerformSupervisorActions = isAdmin || role === UserRole.SUPERVISOR;

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 bg-white min-h-full rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm border border-slate-100 pb-20 sm:pb-12 overflow-x-hidden text-left">
      {previewImage && (
        <FilePreviewer 
          url={previewImage.url} 
          name={`Фото #${previewImage.index + 1}`} 
          category={FileCategory.PHOTO} 
          onClose={() => setPreviewImage(null)} 
        />
      )}

      <div className="flex items-center justify-between mb-6 sm:mb-10">
        <button onClick={onClose} className="flex items-center gap-2 sm:gap-3 text-slate-500 font-black text-[9px] sm:text-[11px] uppercase tracking-widest bg-slate-50 px-3 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-95">
          <ChevronLeft size={18} className="sm:w-5 sm:h-5" /> Назад
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {canEditInfo && !isEditingInfo && (
            <button 
              onClick={() => setIsEditingInfo(true)}
              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
              title="Редактировать описание"
            >
              <Pencil size={18} />
            </button>
          )}
          <span className={`text-[9px] sm:text-[10px] uppercase font-black px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border ${statusColors[task.status]}`}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>

      <div className="mb-8 sm:mb-10 px-1">
        {isEditingInfo ? (
          <div className="space-y-4 animate-in fade-in duration-300 bg-slate-50 p-6 rounded-[2rem] border border-blue-100 shadow-inner">
            <div className="flex items-center gap-3 mb-2">
              <Type size={16} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Параметры задачи</span>
            </div>
            <input 
              ref={titleRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Название задачи"
              className="w-full text-lg sm:text-xl font-black text-slate-800 border-b-2 border-blue-500 outline-none pb-2 bg-transparent px-2"
            />
            <textarea 
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Подробное описание работ..."
              rows={4}
              className="w-full text-slate-600 text-sm sm:text-base font-medium leading-relaxed border-b border-blue-200 outline-none bg-transparent px-2 resize-none"
            />
            <div className="flex gap-2 pt-4">
              <button 
                onClick={() => { setIsEditingInfo(false); setEditedTitle(task.title); setEditedDescription(task.description); }}
                className="flex-1 bg-white text-slate-400 font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest border border-slate-200 active:scale-95 transition-all"
              >
                Отмена
              </button>
              <button 
                onClick={handleSaveInfo}
                className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl uppercase text-[9px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all"
              >
                <Save size={16} /> Применить
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={`group relative ${canEditInfo ? 'cursor-pointer hover:bg-slate-50 rounded-2xl p-4 -mx-4 transition-all' : ''}`}
            onClick={() => canEditInfo && setIsEditingInfo(true)}
          >
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 sm:mb-3 leading-tight tracking-tighter flex items-center gap-3 uppercase">
              {task.title}
              {canEditInfo && <Pencil size={14} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />}
            </h2>
            <div className="h-0.5 w-12 bg-blue-600 mb-4"></div>
            <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}
      </div>

      {task.aiAnalysis && (
        <div className={`mb-8 sm:mb-10 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 animate-in slide-in-from-top-4 ${
          task.aiAnalysis.status === 'passed' ? 'bg-emerald-50/50 border-emerald-100' : 
          task.aiAnalysis.status === 'warning' ? 'bg-amber-50/50 border-amber-100' : 
          'bg-rose-50/50 border-rose-100'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Sparkles className={`${task.aiAnalysis.status === 'passed' ? 'text-emerald-500' : task.aiAnalysis.status === 'warning' ? 'text-amber-500' : 'text-rose-500'} sm:w-6 sm:h-6`} size={20} />
            <h4 className="text-[10px] sm:text-sm font-black uppercase tracking-widest">Анализ ЗОДЧИЙ AI</h4>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed mb-3 sm:mb-4">{task.aiAnalysis.feedback}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 sm:gap-10">
        <div className="space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 sm:gap-3"><Files size={16} className="sm:w-4.5 sm:h-4.5" /> Фотоотчеты</h4>
            <div className="flex gap-1.5 sm:gap-2">
              {task.evidenceUrls.length > 0 && (
                <button 
                  onClick={runAIAudit}
                  disabled={isAIAnalyzing}
                  className="text-slate-100 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-700 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                >
                  {isAIAnalyzing ? <Sparkles size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span className="hidden xs:inline">{isAIAnalyzing ? '...' : 'Аудит'}</span>
                </button>
              )}
              {canPerformForemanActions && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REWORK) && (
                <>
                  <input type="file" ref={evidenceInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleAddEvidenceFile} />
                  <button 
                    onClick={() => evidenceInputRef.current?.click()}
                    className="text-blue-600 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-blue-100 active:scale-95 transition-all"
                  >
                    <ImagePlus size={14} /> Добавить
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4">
            {task.evidenceUrls.length === 0 ? (
              <div className="col-span-full py-12 sm:py-16 bg-slate-50 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 sm:gap-3 text-slate-300">
                <Camera size={28} className="sm:w-8 sm:h-8" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Нет фото</span>
              </div>
            ) : (
              task.evidenceUrls.map((url, i) => (
                <div 
                  key={i} 
                  onClick={() => setPreviewImage({ url, index: i })}
                  className="aspect-square bg-slate-100 rounded-xl sm:rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-sm relative group active:scale-95 transition-all cursor-pointer"
                >
                  <img src={url} alt={`Evidence ${i}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 right-1.5 bg-black/40 text-slate-100 px-1.5 py-0.5 rounded-md text-[8px] font-black">#{i+1}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <h4 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 sm:gap-3 px-1"><MessageSquare size={16} className="sm:w-4.5 sm:h-4.5" /> История</h4>
          <div className="bg-slate-50 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 min-h-[180px] max-h-[350px] overflow-y-auto flex flex-col gap-4 shadow-inner scrollbar-hide">
            {(task.comments || []).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-300 opacity-40 py-8 text-center">
                <MessageSquare size={32} />
                <span className="text-[9px] font-black uppercase tracking-widest">Нет записей</span>
              </div>
            ) : (
              task.comments?.map((c) => (
                <div key={c.id} className={`flex flex-col ${c.role === role ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[95%] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border ${c.role === role ? 'bg-blue-600 text-slate-100 border-blue-600' : 'bg-white text-slate-800 border-slate-100'}`}>
                    <div className="flex justify-between items-center gap-3 sm:gap-5 mb-1 sm:mb-2">
                      <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${c.role === role ? 'text-blue-100' : 'text-blue-600'}`}>{c.author}</span>
                      <span className={`text-[7px] sm:text-[8px] font-bold uppercase ${c.role === role ? 'text-slate-100/60' : 'text-slate-300'}`}>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 bg-white p-2 rounded-xl sm:rounded-[1.5rem] border border-slate-100 shadow-md">
            <input 
              type="text" 
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder="Текст..." 
              className="flex-1 bg-transparent px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none"
            />
            <button onClick={handleSendComment} className="bg-blue-600 text-slate-100 p-3 sm:p-4 rounded-lg sm:rounded-2xl shadow-lg active:scale-90 transition-all shrink-0">
              <SendHorizontal size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 pb-4">
          {canPerformForemanActions && (
            <>
              {task.status === TaskStatus.TODO && (
                <button 
                  onClick={() => onStatusChange(task.id, TaskStatus.IN_PROGRESS)}
                  className="w-full flex items-center justify-center gap-3 bg-blue-600 text-slate-100 font-black py-4 sm:py-6 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98] text-sm sm:text-base uppercase tracking-widest"
                >
                  <Play size={20} fill="currentColor" /> Начать
                </button>
              )}
              {(task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REWORK) && (
                <div className="space-y-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleStatusChangeWithFile} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-slate-100 font-black py-4 sm:py-6 rounded-2xl transition-all shadow-xl shadow-emerald-100 active:scale-[0.98] text-sm sm:text-base uppercase tracking-widest"
                  >
                    <Camera size={24} /> Сдать работу
                  </button>
                </div>
              )}
            </>
          )}

          {canPerformSupervisorActions && task.status === TaskStatus.REVIEW && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
              {!showReworkInput ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowReworkInput(true)}
                    className="flex items-center justify-center gap-2 bg-white text-rose-600 border-2 border-rose-100 font-black py-4 rounded-2xl active:scale-[0.98] transition-all text-[10px] sm:text-sm uppercase tracking-widest shadow-sm"
                  >
                    <RotateCcw size={18} /> Доработка
                  </button>
                  <button 
                    onClick={() => onStatusChange(task.id, TaskStatus.DONE)}
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-slate-100 font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all text-[10px] sm:text-sm uppercase tracking-widest"
                  >
                    <Check size={20} /> Принять
                  </button>
                </div>
              ) : (
                <div className="space-y-4 bg-rose-50/50 p-4 sm:p-7 rounded-2xl sm:rounded-[2rem] border-2 border-rose-100 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                      <Info size={16} /> Что исправить?
                    </h5>
                    <button onClick={() => setShowReworkInput(false)} className="p-1 text-rose-300 hover:text-rose-600 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <textarea 
                    value={reworkComment}
                    onChange={(e) => setReworkComment(e.target.value)}
                    placeholder="Описание недочетов..."
                    className="w-full p-4 border border-rose-100 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 min-h-[120px] outline-none transition-all shadow-inner"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReworkInput(false)} className="flex-1 bg-white text-slate-400 py-4 rounded-xl text-[9px] font-black uppercase border border-slate-100">Отмена</button>
                    <button 
                      onClick={() => onStatusChange(task.id, TaskStatus.REWORK, undefined, reworkComment)}
                      disabled={!reworkComment.trim()}
                      className="flex-[2] bg-rose-600 text-slate-100 py-4 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-rose-100 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      Вернуть
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;