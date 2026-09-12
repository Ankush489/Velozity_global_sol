export type Role = 'Admin' | 'Project Manager' | 'Developer';

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatar_url?: string;
  created_at?: string;
  active_task_count?: number;
}

export interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  project_count?: number;
  created_at: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  client_id: number;
  client_name?: string;
  client_company?: string;
  created_by: number;
  creator_name?: string;
  status: 'Active' | 'On Hold' | 'Completed';
  task_count?: number;
  completed_task_count?: number;
  overdue_task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  project_title?: string;
  project_creator_id?: number;
  title: string;
  description: string;
  assigned_to: number;
  assigned_to_name?: string;
  assigned_to_avatar?: string;
  assigned_to_email?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskActivityLog {
  id: number;
  task_id: number;
  task_title?: string;
  project_id: number;
  project_title?: string;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  user_role?: Role;
  action: string;
  old_status?: TaskStatus;
  new_status?: TaskStatus;
  details: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  task_id?: number;
  task_title?: string;
  project_id?: number;
  project_title?: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  role: Role;
  totalProjects: number;
  totalTasks: number;
  overdueTaskCount?: number;
  activeUsersOnline: number;
  onlineUsersList?: { id: number; name: string; email: string; role: string }[];
  tasksByStatus?: Record<TaskStatus, number>;
  tasksByPriority?: Record<TaskPriority, number>;
  myProjects?: Project[];
  upcomingDueDatesThisWeek?: Task[];
  assignedTasks?: Task[];
  completedTasks?: number;
  inProgressTasks?: number;
  inReviewTasks?: number;
  overdueTasks?: number;
}
