import React from 'react';
import { Role } from '../types/index.js';

export function RoleBadge({ role }: { role: Role }) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  if (role === 'Admin') {
    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (role === 'Project Manager') {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (role === 'Developer') {
    badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
  }

  return (
    <span
      id={`role-badge-${role.toLowerCase().replace(/\s+/g, '-')}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} whitespace-nowrap`}
    >
      {role}
    </span>
  );
}
