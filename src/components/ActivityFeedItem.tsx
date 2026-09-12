import React from 'react';
import { TaskActivityLog } from '../types/index.js';
import { Clock, ArrowRight, AlertCircle, PlusCircle, CheckCircle } from 'lucide-react';

export function ActivityFeedItem({ activity }: { activity: TaskActivityLog; key?: React.Key }) {
  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } catch {
      return '';
    }
  };

  const getActionIcon = () => {
    switch (activity.action) {
      case 'STATUS_CHANGE':
        return <ArrowRight className="w-4 h-4 text-indigo-600" />;
      case 'OVERDUE_FLAGGED':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'TASK_CREATED':
        return <PlusCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      id={`activity-item-${activity.id}`}
      className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
        {getActionIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {/* Formatted Activity String Requirement: "Ravi moved Task #12 from In Progress → In Review · 2 mins ago" */}
          <p className="text-xs text-slate-800 leading-snug font-medium">
            {activity.details}
          </p>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            · {formatRelativeTime(activity.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {activity.project_title && (
            <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {activity.project_title}
            </span>
          )}
          {activity.user_name && (
            <span className="text-[11px] text-slate-400">
              by <span className="font-medium text-slate-600">{activity.user_name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
