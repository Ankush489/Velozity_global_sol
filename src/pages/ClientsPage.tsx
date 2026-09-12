import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Client } from '../types/index.js';
import { Building2, Plus, Mail, FolderKanban, RefreshCw, X, AlertCircle } from 'lucide-react';

export function ClientsPage() {
  const { authFetch } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New client form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/clients');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setClients(json.data.clients);
        }
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await authFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), company: company.trim(), email: email.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowModal(false);
        setName('');
        setCompany('');
        setEmail('');
        fetchClients();
      } else {
        setErrorMsg(json.error?.message || 'Failed to create client.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error creating client.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Client Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise clients, primary contacts, and active project counts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Client
          </button>

          <button
            onClick={fetchClients}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading clients...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {c.company.substring(0, 2).toUpperCase()}
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <FolderKanban className="w-3 h-3 text-slate-400" />
                  {c.project_count || 0} Projects
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{c.company}</h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Contact: {c.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.email}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Client ID: #{c.id}</span>
                <span>Active Engagement</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Add Client Account</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Health Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
