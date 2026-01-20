
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
  Eye
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
  
  const [reworkComment, setReworkComment] = useState('');
  const [showReworkInput, setShowReworkInput] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string, index: number} | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task.comments]);

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
    <div className="animate-in slide-in-from-right-4 duration-300 bg-white min-h-full rounded-[2.5rem] p-6 shadow-sm border border-slate-100 pb-12">
      {/* Photo Preview Overlay */}
      {previewImage && (
        <FilePreviewer 
          url={previewImage.url} 
          name={`Фотоотчет #${previewImage.index + 1}`} 
          category={FileCategory.PHOTO} 
          onClose={() => setPreviewImage(null)} 
        />
      )}

      <div className="flex items-center justify-between mb-10">
        <button onClick={onClose} className="flex items-center gap-3 text-slate-500 font-black text-[11px] uppercase tracking-widest bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-95">
          <ChevronLeft size={22} /> Назад
        </button>
        <div className="flex items-center gap-2">
           {task.aiAnalysis && (
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              task.aiAnalysis.status === 'passed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              task.aiAnalysis.status === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
              'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
              <Sparkles size={16} />
              <span className="text-[10px] font-black uppercase">AI Checked</span>
            </div>
          )}
          <span className={`text-[10px] uppercase font-black px-5 py-2.5 rounded-xl border ${statusColors[task.status]}`}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>

      <div className="mb-10 px-1">
        <h2 className="text-2xl font-black text-slate-800 mb-3 leading-tight tracking-tight">{task.title}</h2>
        <p className="text-slate-600 text-base font-medium leading-relaxed">{task.description}</p>
      </div>

      {/* AI Analysis Summary */}
      {task.aiAnalysis && (
        <div className={`mb-10 p-6 rounded-[2rem] border-2 animate-in slide-in-from-top-4 ${
          task.aiAnalysis.status === 'passed' ? 'bg-emerald-50/50 border-emerald-100' : 
          task.aiAnalysis.status === 'warning' ? 'bg-amber-50/50 border-amber-100' : 
          'bg-rose-50/50 border-rose-100'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className={task.aiAnalysis.status === 'passed' ? 'text-emerald-500' : task.aiAnalysis.status === 'warning' ? 'text-amber-500' : 'text-rose-500'} size={24} />
            <h4 className="text-sm font-black uppercase tracking-widest">Анализ ЗОДЧИЙ AI</h4>
          </div>
          <p className="text-sm font-bold text-slate-700 leading-relaxed mb-4">{task.aiAnalysis.feedback}</p>
          {task.aiAnalysis.detectedIssues.length > 0 && (
            <ul className="space-y-2">
              {task.aiAnalysis.detectedIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] font-bold text-slate-500">
                  <AlertTriangle size={14} className="shrink-0 text-rose-400 mt-0.5" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-10">
        {/* ФОТООТЧЕТЫ */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-3"><Files size={18} /> Фотоотчеты</h4>
            <div className="flex gap-2">
              {task.evidenceUrls.length > 0 && (
                <button 
                  onClick={runAIAudit}
                  disabled={isAIAnalyzing}
                  className="text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 active:scale-95 disabled:opacity-50"
                >
                  {isAIAnalyzing ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isAIAnalyzing ? 'Думает...' : 'ИИ-Аудит'}
                </button>
              )}
              {canPerformForemanActions && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REWORK) && (
                <>
                  <input type="file" ref={evidenceInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleAddEvidenceFile} />
                  <button 
                    onClick={() => evidenceInputRef.current?.click()}
                    className="text-blue-600 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 active:scale-95"
                  >
                    <ImagePlus size={18} /> Добавить
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {task.evidenceUrls.length === 0 ? (
              <div className="col-span-full py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Camera size={32} />
                <span className="text-[10px] font-black uppercase tracking-wider">Фотографии отсутствуют</span>
              </div>
            ) : (
              task.evidenceUrls.map((url, i) => (
                <div 
                  key={i} 
                  onClick={() => setPreviewImage({ url, index: i })}
                  className="aspect-square bg-slate-100 rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-sm relative group active:scale-95 transition-all cursor-pointer"
                >
                  <img src={url} alt={`Evidence ${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute top-2 right-2 bg-black/40 text-white px-2 py-1 rounded-lg text-[9px] font-black">#{i+1}</div>
                  <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={24} className="text-white" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ЧАТ / КОММЕНТАРИИ */}
        <div className="space-y-5">
          <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-3 px-1"><MessageSquare size={18} /> История изменений</h4>
          <div className="bg-slate-50 rounded-[2rem] p-6 min-h-[250px] max-h-[450px] overflow-y-auto flex flex-col gap-5 shadow-inner">
            {(task.comments || []).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300 opacity-40 py-12">
                <MessageSquare size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest">Комментариев нет</span>
              </div>
            ) : (
              task.comments?.map((c) => (
                <div key={c.id} className={`flex flex-col ${c.author === role ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-4 rounded-2xl shadow-sm border ${c.author === role ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-800 border-slate-100'}`}>
                    <div className="flex justify-between items-center gap-5 mb-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${c.author === role ? 'text-blue-100' : 'text-blue-600'}`}>{c.author}</span>
                      <span className={`text-[8px] font-bold uppercase ${c.author === role ? 'text-white/60' : 'text-slate-300'}`}>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-3 bg-white p-2.5 rounded-[1.5rem] border border-slate-100 shadow-md">
            <input 
              type="text" 
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder="Напишите комментарий..." 
              className="flex-1 bg-transparent px-5 py-4 text-base font-bold text-slate-700 outline-none"
            />
            <button onClick={handleSendComment} className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-100 active:scale-90 transition-all">
              <SendHorizontal size={24} />
            </button>
          </div>
        </div>

        {/* УПРАВЛЕНИЕ СТАТУСОМ */}
        <div className="border-t border-slate-100 pt-10 pb-6">
          {canPerformForemanActions && (
            <>
              {task.status === TaskStatus.TODO && (
                <button 
                  onClick={() => onStatusChange(task.id, TaskStatus.IN_PROGRESS)}
                  className="w-full flex items-center justify-center gap-4 bg-blue-600 text-white font-black py-6 rounded-2xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98] text-base uppercase tracking-widest"
                >
                  <Play size={28} fill="currentColor" /> Начать работу
                </button>
              )}

              {(task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REWORK) && (
                <div className="space-y-4">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleStatusChangeWithFile} />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-4 bg-emerald-600 text-white font-black py-6 rounded-2xl transition-all shadow-xl shadow-emerald-100 active:scale-[0.98] text-base uppercase tracking-widest"
                  >
                    <Camera size={32} /> Сдать работу
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-tighter italic px-6 leading-relaxed">Для смены статуса на проверку необходимо сделать свежий снимок объекта</p>
                </div>
              )}
            </>
          )}

          {canPerformSupervisorActions && task.status === TaskStatus.REVIEW && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              {!showReworkInput ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowReworkInput(true)}
                    className="flex items-center justify-center gap-3 bg-white text-rose-600 border-2 border-rose-100 font-black py-6 rounded-2xl active:scale-[0.98] transition-all text-sm uppercase tracking-widest shadow-sm"
                  >
                    <RotateCcw size={24} /> На доработку
                  </button>
                  <button 
                    onClick={() => onStatusChange(task.id, TaskStatus.DONE)}
                    className="flex items-center justify-center gap-3 bg-emerald-600 text-white font-black py-6 rounded-2xl shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all text-sm uppercase tracking-widest"
                  >
                    <Check size={28} /> Принять задачу
                  </button>
                </div>
              ) : (
                <div className="space-y-5 bg-rose-50/50 p-7 rounded-[2rem] border-2 border-rose-100 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="text-[11px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                      <Info size={18} /> Что нужно исправить?
                    </h5>
                    <button onClick={() => setShowReworkInput(false)} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  <textarea 
                    value={reworkComment}
                    onChange={(e) => setReworkComment(e.target.value)}
                    placeholder="Опишите замечания подробно..."
                    className="w-full p-5 border-2 border-rose-100 rounded-2xl text-base font-bold text-slate-700 focus:ring-4 focus:ring-rose-100 min-h-[150px] outline-none transition-all shadow-inner"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setShowReworkInput(false)} className="flex-1 bg-white text-slate-400 py-5 rounded-xl text-[10px] font-black uppercase border border-slate-100">Отмена</button>
                    <button 
                      onClick={() => onStatusChange(task.id, TaskStatus.REWORK, undefined, reworkComment)}
                      disabled={!reworkComment.trim()}
                      className="flex-[2] bg-rose-600 text-white py-5 rounded-xl text-[10px] font-black uppercase shadow-xl shadow-rose-100 disabled:opacity-50 active:scale-95 transition-all"
                    >
                      Вернуть задачу
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
