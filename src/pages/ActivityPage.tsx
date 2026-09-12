import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { ActivityFeedItem } from '../components/ActivityFeedItem.js';
import { Activity, Radio, RefreshCw } from 'lucide-react';

export function ActivityPage() {
  const { user } = useAuth();
  const { activities, isConnected, fetchRecentActivities } = useSocket();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-indigo-600" />
              Live Team Activity Feed
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
              {isConnected ? 'Real-time WebSocket' : 'Reconnecting...'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user.role === 'Admin' && 'Real-time global event stream of all status changes, task creations, and overdue alerts.'}
            {user.role === 'Project Manager' && 'Real-time stream of all events occurring inside your managed client projects.'}
            {user.role === 'Developer' && 'Real-time stream of events affecting tasks assigned to you.'}
          </p>
        </div>

        <button
          onClick={fetchRecentActivities}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-center"
          title="Refresh Feed"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh Feed
        </button>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
          <span>Streaming events ({activities.length} loaded)</span>
          <span className="italic">Ordered from newest to oldest</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No activities recorded yet. Status updates will stream here in real time.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <ActivityFeedItem key={act.id} activity={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
