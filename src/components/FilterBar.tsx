import React from 'react';
import { Search, Filter, Calendar, X, Share2, Check } from 'lucide-react';
import { TaskStatus, TaskPriority } from '../types/index.js';

interface FilterBarProps {
  status: string;
  setStatus: (s: string) => void;
  priority: string;
  prioritySet: (p: string) => void;
  search: string;
  setSearch: (s: string) => void;
  dueDateFrom: string;
  setDueDateFrom: (d: string) => void;
  dueDateTo: string;
  setDueDateTo: (d: string) => void;
  resetFilters: () => void;
}

export function FilterBar({
  status,
  setStatus,
  priority,
  prioritySet,
  search,
  setSearch,
  dueDateFrom,
  setDueDateFrom,
  dueDateTo,
  setDueDateTo,
  resetFilters,
}: FilterBarProps) {
  const [copied, setCopied] = React.useState(false);

  const hasActiveFilters =
    status !== 'ALL' ||
    priority !== 'ALL' ||
    search.trim() !== '' ||
    dueDateFrom !== '' ||
    dueDateTo !== '';

  const copyShareableUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="task-search-input"
            type="text"
            placeholder="Search tasks by title or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}

          <button
            id="copy-shareable-url-btn"
            onClick={copyShareableUrl}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            title="Filters are synced to URL. Click to copy shareable link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Share Filter URL'}
          </button>
        </div>
      </div>

      {/* Filter Dropdowns & Date Selectors */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">Filters:</span>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-status-select" className="text-slate-500">Status:</label>
          <select
            id="filter-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>
        </div>

        {/* Priority Dropdown */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-priority-select" className="text-slate-500">Priority:</label>
          <select
            id="filter-priority-select"
            value={priority}
            onChange={(e) => prioritySet(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Due Date Range */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <label htmlFor="filter-due-from-input" className="text-slate-500">From:</label>
          <input
            id="filter-due-from-input"
            type="date"
            value={dueDateFrom}
            onChange={(e) => setDueDateFrom(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono text-[11px]"
          />
          <label htmlFor="filter-due-to-input" className="text-slate-500">To:</label>
          <input
            id="filter-due-to-input"
            type="date"
            value={dueDateTo}
            onChange={(e) => setDueDateTo(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
