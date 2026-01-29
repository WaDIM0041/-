
import React, { useState } from 'react';
import { 
  Users, Shield, UserPlus, Activity, X, Trash2, Pencil, Lock, Eye, Monitor, Check, 
  User as UserIcon, Briefcase 
} from 'lucide-react';
import { User, UserRole, ROLE_LABELS } from '../types.ts';

interface AdminPanelProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  currentUser: User;
  activeRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  users, 
  onUpdateUsers, 
  currentUser, 
  activeRole, 
  onRoleSwitch 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState<{ username: string; role: UserRole; password?: string }>({
    username: '',
    role: UserRole.FOREMAN,
    password: '',
  });

  const getRoleIcon = (role: UserRole, size = 16) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield size={size} />;
      case UserRole.HEAD: return <Briefcase size={size} />;
      case UserRole.MANAGER: return <Activity size={size} />;
      case UserRole.FOREMAN: return <Users size={size} />;
      case UserRole.SUPERVISOR: return <Eye size={size} />;
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setUserForm({ username: '', role: UserRole.FOREMAN, password: '' });
    setShowForm(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setUserForm({ username: user.username, role: user.role, password: user.password || '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim()) return;

    if (modalMode === 'create') {
      const newUser: User = {
        id: Date.now(),
        username: userForm.username.trim(),
        role: userForm.role,
        password: userForm.password || '123'
      };
      onUpdateUsers([...users, newUser]);
    } else if (modalMode === 'edit' && editingUserId !== null) {
      onUpdateUsers(users.map(u => 
        u.id === editingUserId 
          ? { ...u, username: userForm.username.trim(), role: userForm.role, password: userForm.password } 
          : u
      ));
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm border-l-4 border-l-amber-500 text-left">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Monitor size={20} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Режим просмотра</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">Симуляция интерфейса</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
            const role = roleKey as UserRole;
            const isActive = activeRole === role;
            return (
              <button
                key={role}
                onClick={() => onRoleSwitch(role)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                  isActive 
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-100' 
                    : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200 hover:text-amber-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-50'}`}>
                  {getRoleIcon(role)}
                </div>
                <span className="text-[8px] font-black uppercase tracking-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-[2.5rem] p-8 border-2 border-blue-500 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter text-left">
              {modalMode === 'create' ? 'Новый сотрудник' : 'Данные сотрудника'}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-800 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <UserIcon size={12} /> ФИО / Позывной
                </label>
                <input 
                  required 
                  value={userForm.username} 
                  onChange={e => setUserForm({...userForm, username: e.target.value})} 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all" 
                  placeholder="Имя..." 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Lock size={12} /> Пароль
                </label>
                <input 
                  required 
                  type="text" 
                  value={userForm.password} 
                  onChange={e => setUserForm({...userForm, password: e.target.value})} 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 transition-all" 
                  placeholder="Пароль" 
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Должность</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <button 
                    key={value} 
                    type="button" 
                    onClick={() => setUserForm({...userForm, role: value as UserRole})} 
                    className={`p-3 rounded-xl border transition-all text-[9px] font-black uppercase flex flex-col items-center gap-2 ${
                      userForm.role === value 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xl' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    {getRoleIcon(value as UserRole, 14)}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-[1.5rem] uppercase tracking-widest text-[10px]"
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-widest text-[10px] shadow-2xl hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                {modalMode === 'create' ? 'Зачислить' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden text-left">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Команда проекта</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Всего: {users.length}</p>
          </div>
          {!showForm && (
            <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
              <UserPlus size={16} /> Добавить
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-50">
          {users.map((user) => (
            <div key={user.id} className="p-7 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black uppercase transition-all ${
                  user.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-600' :
                  user.role === UserRole.HEAD ? 'bg-slate-100 text-slate-600' :
                  user.role === UserRole.MANAGER ? 'bg-indigo-100 text-indigo-600' :
                  user.role === UserRole.SUPERVISOR ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {getRoleIcon(user.role, 24)}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 text-base">{user.username}</h4>
                    {user.id === currentUser.id && <span className="bg-blue-600 text-white text-[7px] px-1.5 py-0.5 rounded-full uppercase font-black">Вы</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenEdit(user)} className="p-3 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm sm:shadow-none"><Pencil size={20} /></button>
                {user.id !== currentUser.id && (
                  <button onClick={() => onUpdateUsers(users.filter(u => u.id !== user.id))} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm sm:shadow-none"><Trash2 size={20} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
