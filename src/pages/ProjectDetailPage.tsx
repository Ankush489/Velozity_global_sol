import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { Project, Task, TaskStatus } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { TaskDetailsModal } from '../components/TaskDetailsModal.js';
import { CreateTaskModal } from '../components/CreateTaskModal.js';
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Building,
  User,
  Radio,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface ProjectDetailPageProps {
  projectId: number;
  onBack: () => void;
}

export function ProjectDetailPage({ projectId, onBack }: ProjectDetailPageProps) {
  const { user, authFetch } = useAuth();
  const { subscribeProject, unsubscribeProject, latestTaskUpdate } = useSocket();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Subscribe to project room on mount
  useEffect(() => {
    subscribeProject(projectId);
    return () => {
      unsubscribeProject();
    };
  }, [projectId, subscribeProject, unsubscribeProject]);

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes] = await Promise.all([
        authFetch(`/api/projects/${projectId}`),
        authFetch(`/api/tasks?projectId=${projectId}`),
      ]);

      const projJson = await projRes.json();
      const tasksJson = await tasksRes.json();

      if (projJson.success) setProject(projJson.data.project);
      if (tasksJson.success) setTasks(tasksJson.data.tasks);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Handle incoming real-time task update via WebSocket
  useEffect(() => {
    if (latestTaskUpdate && latestTaskUpdate.project_id === projectId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === latestTaskUpdate.id ? { ...t, ...latestTaskUpdate } : t))
      );
    }
  }, [latestTaskUpdate, projectId]);

  if (!user) return null;

  const columns: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

  const canCreateTask = user.role === 'Admin' || (user.role === 'Project Manager' && project?.created_by === user.id);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          id="back-to-projects-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </button>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button
              id="view-kanban-btn"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="view-list-btn"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {canCreateTask && (
            <button
              id="add-task-to-project-btn"
              onClick={() => setShowCreateTask(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          )}

          <button
            onClick={fetchProjectData}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Project Overview Card */}
      {project && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Building className="w-3 h-3" />
                {project.client_company || project.client_name}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Live Project Room
              </span>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {project.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            {project.description}
          </p>
        </div>
      )}

      {/* Tasks View: Kanban or List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading project tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
          <p className="text-sm font-bold text-slate-800">No tasks in this project yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            {canCreateTask ? 'Click "Add Task" above to create deliverables.' : 'A project manager will assign tasks soon.'}
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Columns */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div
                key={col}
                className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-3 min-h-[400px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={col} />
                    <span className="text-xs font-bold text-slate-600 font-mono">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      id={`kanban-task-card-${t.id}`}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <PriorityBadge priority={t.priority} />
                        {t.is_overdue && t.status !== 'Done' && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {t.title}
                      </h4>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium truncate max-w-[100px]">
                            {t.assigned_to_name || 'Unassigned'}
                          </span>
                        </div>

                        <span className="font-mono text-[10px]">
                          {new Date(t.due_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Empty column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
          {tasks.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTaskId(t.id)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                </div>
                <p className="text-[11px] text-slate-500">
                  Assigned to <span className="font-medium text-slate-700">{t.assigned_to_name}</span> · Due{' '}
                  <span className="font-mono">
                    {new Date(t.due_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <StatusBadge status={t.status} isOverdue={t.is_overdue} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={(updatedTask) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            );
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          initialProjectId={projectId}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            fetchProjectData();
          }}
        />
      )}
    </div>
  );
}
