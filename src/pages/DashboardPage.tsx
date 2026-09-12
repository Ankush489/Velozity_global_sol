import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { DashboardStats, Task, Project } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { PriorityBadge } from '../components/PriorityBadge.js';
import { ActivityFeedItem } from '../components/ActivityFeedItem.js';
import { TaskDetailsModal } from '../components/TaskDetailsModal.js';
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  Activity,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string, projectId?: number) => void;
  onOpenCreateTask: () => void;
}

export function DashboardPage({ onNavigate, onOpenCreateTask }: DashboardPageProps) {
  const { user, authFetch } = useAuth();
  const { activities, onlineCount, onlineUsers } = useSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/stats/dashboard');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user.role === 'Admin' && 'Executive overview of agency clients, delivery pipelines, and live team throughput.'}
            {user.role === 'Project Manager' && 'Manage your project milestones, upcoming deliverables, and developer assignments.'}
            {user.role === 'Developer' && 'Your sprint queue, prioritized by critical impact and delivery deadlines.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {(user.role === 'Admin' || user.role === 'Project Manager') && (
            <button
              id="dash-create-task-btn"
              onClick={onOpenCreateTask}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}

          <button
            id="dash-refresh-btn"
            onClick={fetchStats}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      {user.role === 'Admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            id="metric-total-projects"
            onClick={() => onNavigate('projects')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Projects
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3">
              {stats?.totalProjects ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">Active client work</span>
            </p>
          </div>

          <div
            id="metric-total-tasks"
            onClick={() => onNavigate('tasks')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Tasks
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3">
              {stats?.totalTasks ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Done: {stats?.tasksByStatus?.['Done'] ?? 0} · In Progress: {stats?.tasksByStatus?.['In Progress'] ?? 0}
            </p>
          </div>

          <div
            id="metric-overdue-tasks"
            onClick={() => onNavigate('tasks')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue Tasks
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-rose-600 mt-3">
              {stats?.overdueTaskCount ?? 0}
            </p>
            <p className="text-xs text-rose-500 mt-1 font-medium">
              Requires escalation
            </p>
          </div>

          <div
            id="metric-active-users"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team Online Now
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3 flex items-center gap-2">
              {onlineCount}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Live WebSocket sessions
            </p>
          </div>
        </div>
      )}

      {user.role === 'Project Manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            id="metric-pm-projects"
            onClick={() => onNavigate('projects')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                My Projects
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3">
              {stats?.totalProjects ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Managed by you
            </p>
          </div>

          <div
            id="metric-pm-tasks"
            onClick={() => onNavigate('tasks')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Project Tasks
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3">
              {stats?.totalTasks ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Across your managed projects
            </p>
          </div>

          <div
            id="metric-pm-overdue"
            onClick={() => onNavigate('tasks')}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue Tasks
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-rose-600 mt-3">
              {stats?.overdueTaskCount ?? 0}
            </p>
            <p className="text-xs text-rose-500 mt-1 font-medium">
              Flagged by scheduler
            </p>
          </div>

          <div
            id="metric-pm-critical"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Critical Priority
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-600 mt-3">
              {stats?.tasksByPriority?.['Critical'] ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Requires immediate delivery
            </p>
          </div>
        </div>
      )}

      {user.role === 'Developer' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                My Assigned Tasks
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mt-3">
              {stats?.totalTasks ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Assigned strictly to you
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                In Progress
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-600 mt-3">
              {stats?.inProgressTasks ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Active engineering focus
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-rose-600 mt-3">
              {stats?.overdueTasks ?? 0}
            </p>
            <p className="text-xs text-rose-500 mt-1 font-medium">
              Past completion deadline
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-600 mt-3">
              {stats?.completedTasks ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Delivered and closed
            </p>
          </div>
        </div>
      )}

      {/* Main Content Layout: Tasks / Projects on Left, Live Activity Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Role Specific Views */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin: Tasks by Status Breakdown */}
          {user.role === 'Admin' && stats?.tasksByStatus && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Agency Delivery Pipeline by Status
                </h3>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  View all tasks <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <StatusBadge status={status as any} />
                    <p className="text-2xl font-black text-slate-900 mt-2">
                      {count}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {stats.totalTasks > 0
                        ? `${Math.round((Number(count) / stats.totalTasks) * 100)}% of total`
                        : '0%'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PM: Upcoming due dates this week */}
          {user.role === 'Project Manager' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Upcoming Due Dates This Week
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tasks scheduled for delivery in the next 7 days
                  </p>
                </div>
              </div>

              {stats?.upcomingDueDatesThisWeek && stats.upcomingDueDatesThisWeek.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.upcomingDueDatesThisWeek.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {t.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Project: {t.project_title} · Dev: {t.assigned_to_name || 'Unassigned'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-semibold text-slate-700 block">
                          {new Date(t.due_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <StatusBadge status={t.status} isOverdue={t.is_overdue} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No upcoming deadlines this week.
                </div>
              )}
            </div>
          )}

          {/* Developer: Assigned tasks sorted by priority then due date */}
          {user.role === 'Developer' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    My Task Queue (Sorted by Priority & Due Date)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any task to inspect details and advance status
                  </p>
                </div>
              </div>

              {stats?.assignedTasks && stats.assignedTasks.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.assignedTasks.map((t) => (
                    <div
                      key={t.id}
                      id={`dev-task-row-${t.id}`}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {t.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {t.project_title} · Due{' '}
                          <span className="font-mono">
                            {new Date(t.due_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={t.status} isOverdue={t.is_overdue} />
                        <span className="text-xs text-indigo-600 font-semibold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                          Update →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  You have no tasks currently assigned.
                </div>
              )}
            </div>
          )}

          {/* PM / Admin Managed Projects List */}
          {(user.role === 'Admin' || user.role === 'Project Manager') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Active Projects
                </h3>
                <button
                  onClick={() => onNavigate('projects')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  All projects <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {(stats?.myProjects || []).slice(0, 3).map((p) => {
                  const taskCount = Number(p.task_count) || 0;
                  const completedCount = Number(p.completed_task_count) || 0;
                  const pct = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onNavigate('projects', p.id)}
                      className="p-4 rounded-xl border border-slate-200/70 hover:border-indigo-300 hover:bg-slate-50/50 cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">
                          {p.title}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-500">
                          {p.client_company || p.client_name}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Progress ({completedCount}/{taskCount} tasks)</span>
                          <span className="font-mono font-bold text-slate-700">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Real-Time Activity Feed */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Live Activity Feed
                </h3>
              </div>
              <button
                onClick={() => onNavigate('activity')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                View Full Feed →
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Real-time WebSocket event stream filtered for your role:
            </p>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No activity events recorded yet.
                </div>
              ) : (
                activities.slice(0, 8).map((act) => (
                  <ActivityFeedItem key={act.id} activity={act} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => {
            fetchStats();
          }}
        />
      )}
    </div>
  );
}
