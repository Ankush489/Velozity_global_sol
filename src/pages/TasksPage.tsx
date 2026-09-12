import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { Task } from '../types/index.js';
import { FilterBar } from '../components/FilterBar.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { TaskDetailsModal } from '../components/TaskDetailsModal.js';
import { CreateTaskModal } from '../components/CreateTaskModal.js';
import {
  CheckSquare,
  Plus,
  Calendar,
  User,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export function TasksPage() {
  const { user, authFetch } = useAuth();
  const { latestTaskUpdate } = useSocket();

  // Read initial filter values from URLSearchParams
  const getParam = (key: string, defaultVal: string) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || defaultVal;
  };

  const [status, setStatus] = useState<string>(() => getParam('status', 'ALL'));
  const [priority, setPriority] = useState<string>(() => getParam('priority', 'ALL'));
  const [search, setSearch] = useState<string>(() => getParam('search', ''));
  const [dueDateFrom, setDueDateFrom] = useState<string>(() => getParam('dueDateFrom', ''));
  const [dueDateTo, setDueDateTo] = useState<string>(() => getParam('dueDateTo', ''));

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Sync state changes back to URLSearchParams
  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== 'ALL') params.set('status', status);
    if (priority !== 'ALL') params.set('priority', priority);
    if (search.trim()) params.set('search', search.trim());
    if (dueDateFrom) params.set('dueDateFrom', dueDateFrom);
    if (dueDateTo) params.set('dueDateTo', dueDateTo);

    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [status, priority, search, dueDateFrom, dueDateTo]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (priority !== 'ALL') params.set('priority', priority);
      if (dueDateFrom) params.set('dueDateFrom', dueDateFrom);
      if (dueDateTo) params.set('dueDateTo', dueDateTo);

      const res = await authFetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTasks(json.data.tasks);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [status, priority, dueDateFrom, dueDateTo, authFetch]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time task status updates from WebSocket
  useEffect(() => {
    if (latestTaskUpdate) {
      setTasks((prev) =>
        prev.map((t) => (t.id === latestTaskUpdate.id ? { ...t, ...latestTaskUpdate } : t))
      );
    }
  }, [latestTaskUpdate]);

  const resetFilters = () => {
    setStatus('ALL');
    setPriority('ALL');
    setSearch('');
    setDueDateFrom('');
    setDueDateTo('');
  };

  // Client-side text filter for instant search responsiveness
  const filteredTasks = tasks.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.project_title && t.project_title.toLowerCase().includes(q)) ||
      (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
    );
  });

  const canCreateTask = user?.role === 'Admin' || user?.role === 'Project Manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            Tasks & Deliverables
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'Admin' && 'Viewing all agency tasks across all client projects.'}
            {user?.role === 'Project Manager' && 'Viewing tasks across your managed projects.'}
            {user?.role === 'Developer' && 'Viewing tasks assigned strictly to you.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canCreateTask && (
            <button
              id="create-task-btn"
              onClick={() => setShowCreateTask(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}

          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar (Shareable URL Queries) */}
      <FilterBar
        status={status}
        setStatus={setStatus}
        priority={priority}
        prioritySet={setPriority}
        search={search}
        setSearch={setSearch}
        dueDateFrom={dueDateFrom}
        setDueDateFrom={setDueDateFrom}
        dueDateTo={dueDateTo}
        setDueDateTo={setDueDateTo}
        resetFilters={resetFilters}
      />

      {/* Task List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800">No matching tasks found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your status, priority, date range, or search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              id={`task-row-${t.id}`}
              onClick={() => setSelectedTaskId(t.id)}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <span className="text-xs font-mono text-slate-400">#{t.id}</span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {t.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 line-clamp-1">
                  {t.description || 'No description'}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                  <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {t.project_title}
                  </span>

                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{t.assigned_to_name || 'Unassigned'}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="font-mono">
                      Due{' '}
                      {new Date(t.due_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                <StatusBadge status={t.status} isOverdue={t.is_overdue} />
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  Details →
                </span>
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
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}
