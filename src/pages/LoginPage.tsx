import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Layers, ShieldCheck, Briefcase, Code2, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials. Password is password123 for all seeded accounts.');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (userEmail: string) => {
    setLoading(true);
    setError(null);
    const success = await login(userEmail, 'password123');
    if (!success) {
      setError('Login failed.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pulse<span className="text-indigo-600">Board</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-Time Client Project Dashboard with Role-Based Access Control
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                placeholder="alex@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default password: password123</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
              Quick 1-Click Evaluation Logins
            </p>

            <div className="space-y-2">
              <button
                type="button"
                id="quick-login-admin"
                onClick={() => handleQuickLogin('admin@agency.com')}
                className="w-full p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block">Alex Vance</span>
                    <span className="text-[11px] text-indigo-600">Admin · Full Agency Access</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-700">Enter →</span>
              </button>

              <button
                type="button"
                id="quick-login-pm"
                onClick={() => handleQuickLogin('pm.sarah@agency.com')}
                className="w-full p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">Sarah Jenkins</span>
                    <span className="text-[11px] text-emerald-600">Project Manager · FinTech & Acme</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">Enter →</span>
              </button>

              <button
                type="button"
                id="quick-login-dev"
                onClick={() => handleQuickLogin('dev.ravi@agency.com')}
                className="w-full p-2.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100/70 text-left transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-4 h-4 text-sky-600" />
                  <div>
                    <span className="text-xs font-bold text-sky-900 block">Ravi Sharma</span>
                    <span className="text-[11px] text-sky-600">Developer · Scoped Tasks Only</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-sky-700">Enter →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
