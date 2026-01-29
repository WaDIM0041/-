
export const APP_VERSION = '2.2.0';

export enum UserRole {
  ADMIN = 'admin',
  HEAD = 'head',
  MANAGER = 'manager',
  FOREMAN = 'foreman',
  SUPERVISOR = 'supervisor'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  REWORK = 'rework'
}

/**
 * Fix: Added missing FileCategory enum for task and project files
 */
export enum FileCategory {
  PHOTO = 'photo',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.HEAD]: 'Руководитель',
  [UserRole.MANAGER]: 'Менеджер',
  [UserRole.FOREMAN]: 'Прораб',
  [UserRole.SUPERVISOR]: 'Технадзор',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'В плане',
  [TaskStatus.IN_PROGRESS]: 'В работе',
  [TaskStatus.REVIEW]: 'Проверка',
  [TaskStatus.DONE]: 'Готово',
  [TaskStatus.REWORK]: 'Правки',
};

export interface Comment {
  id: string | number;
  author: string;
  role: UserRole;
  text: string;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  password?: string;
}

export interface Project {
  id: number;
  name: string;
  fullName?: string;
  address: string;
  phone: string;
  telegram: string;
  lat?: number;
  lon?: number;
  description?: string;
  updatedAt: string;
}

/**
 * Fix: Added missing AIAnalysisResult interface for construction auditing
 */
export interface AIAnalysisResult {
  status: 'passed' | 'warning' | 'failed';
  feedback: string;
  detectedIssues: string[];
  timestamp: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: TaskStatus;
  evidence: string[]; 
  comments: Comment[];
  updatedAt: string;
  supervisorComment?: string;
  /**
   * Fix: Added aiAnalysis property to Task interface
   */
  aiAnalysis?: AIAnalysisResult;
}

/**
 * Fix: Added missing ProjectFile interface
 */
export interface ProjectFile {
  id: string | number;
  name: string;
  url: string;
  category: FileCategory;
  createdAt: string;
}

export interface AppSnapshot {
  projects: Project[];
  tasks: Task[];
  users: User[];
  timestamp: string;
}

export interface SyncConfig {
  mode: 'local' | 'api' | 'github';
  apiUrl?: string;
  github?: {
    token: string;
    repo: string;
    path: string;
  };
}

export interface InvitePayload {
  mode: 'api' | 'github';
  token?: string;
  repo?: string;
  path?: string;
  apiUrl?: string;
  role: UserRole;
  username: string;
}

/**
 * Fix: Added missing AppNotification interface for NotificationCenter
 */
export interface AppNotification {
  id: number;
  targetRole: UserRole;
  projectTitle: string;
  taskTitle: string;
  createdAt: string;
  type: 'review' | 'rework' | 'done';
  message: string;
  isRead: boolean;
}

/**
 * Fix: Added missing GlobalChatMessage interface for GlobalChat
 */
export interface GlobalChatMessage {
  id: string | number;
  userId: number;
  username: string;
  role: UserRole;
  text: string;
  createdAt: string;
}
