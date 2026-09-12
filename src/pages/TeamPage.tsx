import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { User } from '../types/index.js';
import { RoleBadge } from '../components/RoleBadge.js';
import { Users2, CheckSquare, Mail, RefreshCw } from 'lucide-react';

export function TeamPage() {
  const { authFetch } = useAuth();
  const { onlineUsers } = useSocket();
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTeam(json.data.users);
        }
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const isUserOnline = (userId: number) => {
    return onlineUsers.some((u) => u.id === userId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-indigo-600" />
            Agency Team Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Team roster with real-time presence indicators and active task distribution.
          </p>
        </div>

        <button
          onClick={fetchTeam}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 self-start sm:self-center"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading team roster...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member) => {
            const online = isUserOnline(member.id);
            return (
              <div
                key={member.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={
                        member.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff`
                      }
                      alt={member.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                    <span
                      title={online ? 'Online now' : 'Offline'}
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="mt-2">
                      <RoleBadge role={member.role} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.active_task_count ?? 0} active tasks</span>
                  </span>

                  <span className={`text-[11px] font-semibold ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {online ? 'Active Now' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
