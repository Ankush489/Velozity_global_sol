import React from 'react';
import { TaskPriority } from '../types/index.js';
import { ArrowUp, ArrowDown, Minus, AlertOctagon } from 'lucide-react';

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Minus;

  switch (priority) {
    case 'Critical':
      style = 'bg-red-50 text-red-700 border-red-200 font-semibold';
      Icon = AlertOctagon;
      break;
    case 'High':
      style = 'bg-orange-50 text-orange-700 border-orange-200';
      Icon = ArrowUp;
      break;
    case 'Medium':
      style = 'bg-blue-50 text-blue-700 border-blue-200';
      Icon = Minus;
      break;
    case 'Low':
      style = 'bg-slate-50 text-slate-600 border-slate-200';
      Icon = ArrowDown;
      break;
  }

  return (
    <span
      id={`priority-badge-${priority.toLowerCase()}`}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${style} whitespace-nowrap`}
    >
      <Icon className="w-3 h-3" />
      {priority}
    </span>
  );
}
