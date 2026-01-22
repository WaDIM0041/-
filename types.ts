export const APP_VERSION = '1.8.4';
export const STANDARD_NAME = 'Zodchiy Enterprise Core';

export enum UserRole {
  ADMIN = 'admin',
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

export enum FileCategory {
  DOCUMENT = 'document',
  DRAWING = 'drawing',
  PHOTO = 'photo'
}

export enum ProjectStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Генеральный Зодчий',
  [UserRole.MANAGER]: 'Менеджер проектов',
  [UserRole.FOREMAN]: 'Прораб участка',
  [UserRole.SUPERVISOR]: 'Технадзор',
};

export interface InvitePayload {
  token: string;
  repo: string;
  path: string;
  role: UserRole;
  username: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'Новая',
  [TaskStatus.IN_PROGRESS]: 'В работе',
  [TaskStatus.REVIEW]: 'На проверке',
  [TaskStatus.DONE]: 'Завершено',
  [TaskStatus.REWORK]: 'Доработка',
};

export interface Comment {
  id: string | number;
  author: string;
  role: UserRole;
  text: string;
  createdAt: string;
}

export interface GlobalChatMessage {
  id: string | number;
  userId: number;
  username: string;
  role: UserRole;
  text: string;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
  password?: string;
  lastActive?: string;
}

export interface ProjectFile {
  name: string;
  url: string;
  category: FileCategory;
  createdAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  clientFullName: string;
  city: string;
  street: string;
  phone: string;
  telegram: string;
  address: string;
  geoLocation: { lat: number; lon: number; };
  fileLinks: ProjectFile[];
  progress: number;
  status: ProjectStatus;
  comments?: Comment[];
  updatedAt: string;
}

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
  foremanComment?: string;
  supervisorComment?: string;
  evidenceUrls: string[]; 
  evidenceCount: number;
  comments?: Comment[];
  aiAnalysis?: AIAnalysisResult;
  updatedAt: string;
}

export interface GithubConfig {
  token: string;
  repo: string; 
  path: string; 
}

export interface AppSnapshot {
  version: string;
  timestamp: string;
  projects: Project[];
  tasks: Task[];
  users: User[];
  notifications: AppNotification[];
  chatMessages?: GlobalChatMessage[];
  config?: GithubConfig;
  buildNumber?: number;
}

export interface AppNotification {
  id: number;
  type: 'review' | 'done' | 'rework' | string;
  projectTitle: string;
  taskTitle: string;
  message: string;
  targetRole: UserRole;
  isRead: boolean;
  createdAt: string;
}