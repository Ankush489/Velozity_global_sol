import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Project } from '../types/index.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import {
  FolderKanban,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  User,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

interface ProjectsPageProps {
  onSelectProject: (projectId: number) => void;
}

export function ProjectsPage({ onSelectProject }: ProjectsPageProps) {
  const { user, authFetch } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/projects');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setProjects(json.data.projects);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-600" />
            Client Projects
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user.role === 'Admin' && 'Viewing all agency client projects and active engagements.'}
            {user.role === 'Project Manager' && 'Viewing projects you oversee and manage.'}
            {user.role === 'Developer' && 'Viewing projects where you have active task assignments.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {(user.role === 'Admin' || user.role === 'Project Manager') && (
            <button
              id="create-new-project-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}

          <button
            onClick={fetchProjects}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading client projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800">No projects found</p>
          <p className="text-xs text-slate-500 mt-1">
            {user.role === 'Developer'
              ? 'You have not been assigned tasks in any active projects yet.'
              : 'Create a new project to start tracking client deliverables.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const taskCount = Number(p.task_count) || 0;
            const completedCount = Number(p.completed_task_count) || 0;
            const overdueCount = Number(p.overdue_task_count) || 0;
            const pct = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

            return (
              <div
                key={p.id}
                id={`project-card-${p.id}`}
                onClick={() => onSelectProject(p.id)}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Building className="w-3 h-3 text-indigo-500" />
                      {p.client_company || p.client_name}
                    </span>

                    <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {p.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Delivery Completion</span>
                      <span className="font-mono font-bold text-slate-800">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges & Meta */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">
                      {completedCount}/{taskCount} tasks done
                    </span>

                    {overdueCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={() => {
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
