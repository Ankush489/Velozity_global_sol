import React from 'react';
import { TaskStatus } from '../types/index.js';
import { AlertCircle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export function StatusBadge({
  status,
  isOverdue = false,
}: {
  status: TaskStatus;
  isOverdue?: boolean;
}) {
  if (isOverdue && status !== 'Done') {
    return (
      <span
        id="status-badge-overdue"
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap animate-pulse"
      >
        <AlertCircle className="w-3 h-3 text-rose-600" />
        Overdue
      </span>
    );
  }

  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Clock;

  switch (status) {
    case 'To Do':
      style = 'bg-slate-100 text-slate-700 border-slate-200';
      Icon = Clock;
      break;
    case 'In Progress':
      style = 'bg-amber-50 text-amber-700 border-amber-200';
      Icon = RefreshCw;
      break;
    case 'In Review':
      style = 'bg-purple-50 text-purple-700 border-purple-200';
      Icon = RefreshCw;
      break;
    case 'Done':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      Icon = CheckCircle2;
      break;
  }

  return (
    <span
      id={`status-badge-${status.toLowerCase().replace(/\s+/g, '-')}`}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} whitespace-nowrap`}
    >
      <Icon className="w-3 h-3 opacity-80" />
      {status}
    </span>
  );
}
