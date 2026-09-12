import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskActivityLog } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { StatusBadge } from './StatusBadge.js';
import { PriorityBadge } from './PriorityBadge.js';
import {
  X,
  Clock,
  Calendar,
  User,
  History,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface TaskDetailsModalProps {
  taskId: number | null;
  onClose: () => void;
  onTaskUpdated?: (updatedTask: Task) => void;
}

export function TaskDetailsModal({ taskId, onClose, onTaskUpdated }: TaskDetailsModalProps) {
  const { user, authFetch } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    authFetch(`/api/tasks/${taskId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success) {
          setTask(json.data.task);
          setActivityLogs(json.data.activity_logs || []);
        } else {
          setErrorMsg(json.error?.message || 'Failed to load task details');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [taskId, authFetch]);

  if (!taskId) return null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || updatingStatus || task.status === newStatus) return;
    setUpdatingStatus(true);
    setErrorMsg(null);

    try {
      const res = await authFetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTask(json.data.task);
        if (json.data.activity) {
          setActivityLogs((prev) => [json.data.activity, ...prev]);
        }
        if (onTaskUpdated) {
          onTaskUpdated(json.data.task);
        }
      } else {
        setErrorMsg(json.error?.message || 'Failed to update status');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error updating task status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const canUpdateStatus = () => {
    if (!user || !task) return false;
    if (user.role === 'Admin') return true;
    if (user.role === 'Project Manager' && task.project_creator_id === user.id) return true;
    if (user.role === 'Developer' && task.assigned_to === user.id) return true;
    return false;
  };

  const statuses: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        id="task-details-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
              TASK #{taskId}
            </span>
            {task && <span className="text-xs font-medium text-slate-500">{task.project_title}</span>}
          </div>
          <button
            id="close-task-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Loading task details and audit log...
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {errorMsg}
            </div>
          ) : task ? (
            <>
              {/* Title & Badges */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {task.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <StatusBadge status={task.status} isOverdue={task.is_overdue} />
                  <PriorityBadge priority={task.priority} />
                  {task.is_overdue && task.status !== 'Done' && (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Past Due Date
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Assigned Developer</p>
                    <p className="text-xs font-bold text-slate-800">
                      {task.assigned_to_name || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                    task.is_overdue ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Due Date</p>
                    <p className={`text-xs font-bold font-mono ${task.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                      {new Date(task.due_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Action Buttons (Interactive Status Advancement) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Update Task Status</span>
                  {!canUpdateStatus() && (
                    <span className="text-[11px] text-amber-600 font-medium">
                      (Read only: You are not authorized to update this task)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statuses.map((s) => {
                    const isCurrent = task.status === s;
                    return (
                      <button
                        key={s}
                        id={`btn-set-status-${s.toLowerCase().replace(/\s+/g, '-')}`}
                        disabled={!canUpdateStatus() || updatingStatus || isCurrent}
                        onClick={() => handleStatusChange(s)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Immutable Audit Log Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Database Activity History
                  </span>
                </div>

                <div className="space-y-2">
                  {activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No activity recorded for this task yet.</p>
                  ) : (
                    activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700 flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{log.details}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">by {log.user_name}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
