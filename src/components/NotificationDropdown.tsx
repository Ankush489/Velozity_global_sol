import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Check, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';

export function NotificationDropdown() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'TASK_OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'TASK_IN_REVIEW':
        return <Clock className="w-4 h-4 text-purple-600" />;
      case 'TASK_ASSIGNED':
      default:
        return <UserCheck className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            id="notification-count-badge"
            className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown-menu"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={() => markAllNotificationsRead()}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  id={`notification-item-${n.id}`}
                  onClick={() => !n.is_read && markNotificationRead(n.id)}
                  className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50 flex gap-3 items-start ${
                    !n.is_read ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      title="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(n.id);
                      }}
                      className="text-slate-400 hover:text-indigo-600 p-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
