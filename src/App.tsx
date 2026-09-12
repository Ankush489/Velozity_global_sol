import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { ProjectDetailPage } from './pages/ProjectDetailPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { ClientsPage } from './pages/ClientsPage.js';
import { TeamPage } from './pages/TeamPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { CreateTaskModal } from './components/CreateTaskModal.js';
import { RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showGlobalCreateTask, setShowGlobalCreateTask] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Initializing PulseBoard session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (tab: string, projectId?: number) => {
    setCurrentTab(tab);
    if (projectId !== undefined) {
      setSelectedProjectId(projectId);
    } else if (tab !== 'projects') {
      setSelectedProjectId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navbar with live presence & demo switcher */}
      <Navbar />

      {/* Body Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'projects') {
              setSelectedProjectId(null);
            }
          }}
        />

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              onOpenCreateTask={() => setShowGlobalCreateTask(true)}
            />
          )}

          {currentTab === 'projects' && !selectedProjectId && (
            <ProjectsPage
              onSelectProject={(id) => setSelectedProjectId(id)}
            />
          )}

          {currentTab === 'projects' && selectedProjectId && (
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
            />
          )}

          {currentTab === 'tasks' && <TasksPage />}

          {currentTab === 'activity' && <ActivityPage />}

          {currentTab === 'clients' && <ClientsPage />}

          {currentTab === 'team' && <TeamPage />}
        </main>
      </div>

      {/* Global Create Task Modal */}
      {showGlobalCreateTask && (
        <CreateTaskModal
          onClose={() => setShowGlobalCreateTask(false)}
          onTaskCreated={() => {
            // Task created: WebSocket will broadcast event automatically
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
