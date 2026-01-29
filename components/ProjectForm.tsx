
import React, { useState } from 'react';
import { Project } from '../types.ts';
import { Building2, X, Save, MapPin, Phone, Send, FileText, Globe, User } from 'lucide-react';

interface ProjectFormProps {
  project: Project;
  onSave: (project: Project) => void;
  onCancel: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Project>({ ...project });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-6 duration-500 overflow-hidden text-left">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Редактор объекта</h2>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Изменение паспортных данных</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-800 transition-colors active:scale-90">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Building2 size={12} /> Название объекта
              </label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="Напр. ЖК Магистральный"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <User size={12} /> ФИО Заказчика
              </label>
              <input 
                name="fullName"
                value={formData.fullName || ''}
                onChange={handleChange}
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="Иванов Иван Иванович"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <MapPin size={12} /> Полный адрес для карт
            </label>
            <input 
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all"
              placeholder="Город, улица, дом..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Globe size={12} /> Широта (Lat)
              </label>
              <input 
                name="lat"
                type="number"
                step="any"
                value={formData.lat || ''}
                onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900"
                placeholder="55.7558"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Globe size={12} /> Долгота (Lon)
              </label>
              <input 
                name="lon"
                type="number"
                step="any"
                value={formData.lon || ''}
                onChange={e => setFormData({...formData, lon: parseFloat(e.target.value)})}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900"
                placeholder="37.6173"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Phone size={12} /> Телефон для связи
              </label>
              <input 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Send size={12} /> Telegram @user
              </label>
              <input 
                name="telegram"
                value={formData.telegram}
                onChange={handleChange}
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FileText size={12} /> Описание / Примечание
            </label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all resize-none"
              placeholder="Доп. информация по объекту..."
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
          >
            Отмена
          </button>
          <button 
            type="submit"
            className="flex-[2] py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Save size={18} /> Сохранить изменения
          </button>
        </div>
      </form>
    </div>
  );
};
