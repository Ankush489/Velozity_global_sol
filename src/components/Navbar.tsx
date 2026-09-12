import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { RoleBadge } from './RoleBadge.js';
import { NotificationDropdown } from './NotificationDropdown.js';
import {
  Layers,
  ChevronDown,
  LogOut,
  Radio,
  Users,
} from 'lucide-react';

const DEMO_USERS = [
  { email: 'admin@agency.com', name: 'Alex Vance', role: 'Admin', tag: 'Full Agency Access' },
  { email: 'pm.sarah@agency.com', name: 'Sarah Jenkins', role: 'Project Manager', tag: 'FinTech & Acme Projects' },
  { email: 'pm.marcus@agency.com', name: 'Marcus Brody', role: 'Project Manager', tag: 'HealthPulse Project' },
  { email: 'dev.ravi@agency.com', name: 'Ravi Sharma', role: 'Developer', tag: 'Backend & Security Dev' },
  { email: 'dev.elena@agency.com', name: 'Elena Rostova', role: 'Developer', tag: 'Frontend & UI Dev' },
  { email: 'dev.alex@agency.com', name: 'Alex Chen', role: 'Developer', tag: 'Fullstack & WebRTC Dev' },
  { email: 'dev.priya@agency.com', name: 'Priya Patel', role: 'Developer', tag: 'Integration & PDF Dev' },
];

export function Navbar() {
  const { user, logout, switchUser } = useAuth();
  const { isConnected, onlineCount } = useSocket();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  Pulse<span className="text-indigo-600">Board</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Agency Ops
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Client Project & Real-Time Activity Feed
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Live WebSocket Presence Badge */}
            <div
              id="ws-presence-indicator"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to WebSocket...'}
            >
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
              <span>{isConnected ? 'Live' : 'Reconnecting'}</span>
              <span className="text-slate-300">|</span>
              <Users className="w-3 h-3 text-slate-500" />
              <span className="font-semibold">{onlineCount} online</span>
            </div>

            {/* Quick Demo Switcher Button */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="role-switcher-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <img
                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                />
                <div className="hidden md:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 leading-tight">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <RoleBadge role={user.role} />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  id="user-role-dropdown"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Switch Role (Assessment Demo)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Switch roles to verify API-level permission gating
                    </p>
                  </div>

                  <div className="py-1 max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {DEMO_USERS.map((demo) => {
                      const isCurrent = demo.email === user.email;
                      return (
                        <button
                          key={demo.email}
                          id={`switch-to-${demo.role.toLowerCase().replace(/\s+/g, '-')}-${demo.name.split(' ')[0].toLowerCase()}`}
                          onClick={async () => {
                            await switchUser(demo.email);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                            isCurrent ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {demo.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 rounded">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{demo.tag}</p>
                          </div>
                          <RoleBadge role={demo.role as any} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-1 border-t border-slate-100 px-3">
                    <button
                      id="logout-button"
                      onClick={() => logout()}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
