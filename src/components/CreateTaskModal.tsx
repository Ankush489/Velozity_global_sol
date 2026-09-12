import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Project, User, TaskPriority, TaskStatus } from '../types/index.js';
import { X, PlusCircle, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  initialProjectId?: number;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function CreateTaskModal({ initialProjectId, onClose, onTaskCreated }: CreateTaskModalProps) {
  const { authFetch } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);

  const [projectId, setProjectId] = useState<number | ''>(initialProjectId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<number | ''>('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user's accessible projects
    authFetch('/api/projects')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProjects(json.data.projects);
          if (!initialProjectId && json.data.projects.length > 0) {
            setProjectId(json.data.projects[0].id);
          }
        }
      })
      .catch(console.error);

    // Fetch developers
    authFetch('/api/users/developers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.developers.length > 0) {
          setDevelopers(json.data.developers);
          setAssignedTo(json.data.developers[0].id);
        }
      })
      .catch(console.error);
  }, [authFetch, initialProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !title.trim() || !assignedTo || !dueDate) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: Number(projectId),
          title: title.trim(),
          description: description.trim(),
          assigned_to: Number(assignedTo),
          priority,
          status,
          due_date: new Date(dueDate).toISOString(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onTaskCreated();
        onClose();
      } else {
        setErrorMsg(json.error?.message || 'Failed to create task.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error creating task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        id="create-task-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Create New Task</h3>
          </div>
          <button
            id="close-create-task-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="task-project-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Select Project *
            </label>
            <select
              id="task-project-select"
              required
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.client_name || p.client_company})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title *
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              placeholder="e.g. Implement PCI-DSS Tokenization Vault"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="task-developer-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Assign to Developer *
            </label>
            <select
              id="task-developer-select"
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {developers.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} ({dev.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Priority *
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-due-date-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date *
              </label>
              <input
                id="task-due-date-input"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-description-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Acceptance Criteria
            </label>
            <textarea
              id="task-description-input"
              rows={3}
              placeholder="Technical details, edge cases, and deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="cancel-create-task-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-task-btn"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create & Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
