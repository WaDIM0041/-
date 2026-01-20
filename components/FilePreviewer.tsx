
import React from 'react';
import { X, Download, Maximize2, FileText, ImageIcon } from 'lucide-react';
import { FileCategory } from '../types.ts';

interface FilePreviewerProps {
  url: string;
  name: string;
  category: FileCategory;
  onClose: () => void;
}

export const FilePreviewer: React.FC<FilePreviewerProps> = ({ url, name, category, onClose }) => {
  const isImage = category === FileCategory.PHOTO || 
                  url.startsWith('data:image/') || 
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  
  const isPdf = url.startsWith('data:application/pdf') || /\.pdf$/i.test(name);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-white/10 rounded-xl shrink-0">
            {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black truncate pr-4">{name}</h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Предпросмотр</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href={url} 
            download={name}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            title="Скачать файл"
          >
            <Download size={20} />
          </a>
          <button 
            onClick={onClose}
            className="p-3 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-10">
        {isImage ? (
          <div className="relative max-w-full max-h-full animate-in zoom-in-95 duration-300">
            <img 
              src={url} 
              alt={name} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        ) : isPdf ? (
          <div className="w-full h-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
            <iframe 
              src={url} 
              className="w-full h-full border-none" 
              title={name}
            />
          </div>
        ) : (
          <div className="text-center text-white space-y-6">
            <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto">
              <FileText size={48} className="text-white/40" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black">Просмотр недоступен</p>
              <p className="text-sm text-white/40 max-w-xs mx-auto">
                Данный формат файла нельзя отобразить в браузере. Пожалуйста, скачайте его.
              </p>
            </div>
            <a 
              href={url} 
              download={name}
              className="inline-flex items-center gap-3 bg-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              <Download size={20} /> Скачать файл
            </a>
          </div>
        )}
      </div>

      {/* Footer for mobile context */}
      <div className="p-6 text-center">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">ЗОДЧИЙ • Система визуального контроля</p>
      </div>
    </div>
  );
};
