import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Client } from '../types/index.js';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  onClose: () => void;
  onProjectCreated: () => void;
}

export function CreateProjectModal({ onClose, onProjectCreated }: CreateProjectModalProps) {
  const { authFetch } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [status, setStatus] = useState<'Active' | 'On Hold'>('Active');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    authFetch('/api/clients')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setClients(json.data.clients);
          if (json.data.clients.length > 0) {
            setClientId(json.data.clients[0].id);
          }
        }
      })
      .catch(console.error);
  }, [authFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) {
      setErrorMsg('Please enter a project title and select a client.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          client_id: Number(clientId),
          status,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onProjectCreated();
        onClose();
      } else {
        setErrorMsg(json.error?.message || 'Failed to create project.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error creating project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        id="create-project-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Create New Client Project</h3>
          </div>
          <button
            id="close-create-project-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="project-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Project Title *
            </label>
            <input
              id="project-title-input"
              type="text"
              required
              placeholder="e.g. Enterprise Microservices Migration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="project-client-select" className="block text-xs font-semibold text-slate-700 mb-1">
              Assign to Client *
            </label>
            <select
              id="project-client-select"
              required
              value={clientId}
              onChange={(e) => setClientId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project-description-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="project-description-input"
              rows={3}
              placeholder="Project objectives, milestones, and scope summary..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="cancel-create-project-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-project-btn"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
