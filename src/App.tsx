import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CompaniesView } from './components/CompaniesView';
import { CompanyDetailView } from './components/CompanyDetailView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { AddCompanyModal } from './components/AddCompanyModal';
import { EditCompanyModal } from './components/EditCompanyModal';
import { ArchiveConfirmDialog } from './components/ArchiveConfirmDialog';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { User, Company } from './types';
import { api, getStoredToken } from './lib/api';

function CompanyDetailWrapper({
  refreshTick,
  onBack,
  onOpenEdit,
  onOpenArchiveConfirm
}: {
  refreshTick: number;
  onBack: () => void;
  onOpenEdit: (company: Company) => void;
  onOpenArchiveConfirm: (company: Company) => void;
}) {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <Navigate to="/companies" replace />;
  }
  return (
    <CompanyDetailView
      key={`detail-${id}-${refreshTick}`}
      companyId={id}
      onBack={onBack}
      onOpenEdit={onOpenEdit}
      onOpenArchiveConfirm={onOpenArchiveConfirm}
    />
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Modals & Dialogs
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editCompanyTarget, setEditCompanyTarget] = useState<Company | null>(null);
  const [archiveCompanyTarget, setArchiveCompanyTarget] = useState<Company | null>(null);

  // Operations State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Key to force refresh of companies list or dashboard when data changes
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const getCurrentView = () => {
    if (location.pathname.startsWith('/companies/')) return 'company_detail';
    if (location.pathname.startsWith('/companies')) return 'companies';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };
  const currentView = getCurrentView();

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check auth session on startup
  useEffect(() => {
    const checkSession = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch {
        api.logout();
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    addToast('success', 'Session Authenticated', `Welcome back, ${user.name}`);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    navigate('/dashboard');
    addToast('info', 'Logged Out', 'You have been safely signed out of Studio Barking Dog.');
  };

  const handleNavigate = (view: string) => {
    if (view === 'dashboard') navigate('/dashboard');
    else if (view === 'companies') navigate('/companies');
    else if (view === 'settings') navigate('/settings');
  };

  const handleOpenCompanyDetail = (id: string) => {
    navigate(`/companies/${id}`);
  };

  const handleCompanyCreated = (newId: string) => {
    setRefreshTick((t) => t + 1);
    addToast('success', 'Company Created', 'New organization record successfully saved.');
    navigate(`/companies/${newId}`);
  };

  const handleCompanyUpdated = (updated: Company) => {
    setRefreshTick((t) => t + 1);
    addToast('success', 'Company Updated', `Changes to '${updated.name}' saved.`);
  };

  const handleCompanyArchiveChanged = (updated: Company) => {
    setRefreshTick((t) => t + 1);
    const action = updated.is_archived ? 'Archived' : 'Restored';
    addToast('success', `Company ${action}`, `'${updated.name}' was successfully ${action.toLowerCase()}.`);
  };

  // Auth loading state
  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center animate-pulse">
          BD
        </div>
        <p className="text-xs font-mono tracking-wider uppercase text-slate-500">
          Initializing Engine Foundation...
        </p>
      </div>
    );
  }

  // Unauthenticated user -> Login Screen
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <NotificationToast toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div id="growth-engine-root" className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentView={currentView}
          onOpenAddCompany={() => setIsAddModalOpen(true)}
        />

        {/* Dynamic Body Content routed with React Router */}
        <main className="flex-1 overflow-y-auto bg-slate-100/60 pb-16">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardView
                  key={`dashboard-${refreshTick}`}
                  onNavigateToCompanies={() => navigate('/companies')}
                  onOpenCompanyDetail={handleOpenCompanyDetail}
                  onOpenAddCompany={() => setIsAddModalOpen(true)}
                />
              }
            />
            <Route
              path="/companies"
              element={
                <CompaniesView
                  key={`companies-${refreshTick}`}
                  onOpenCompanyDetail={handleOpenCompanyDetail}
                  onOpenAddCompany={() => setIsAddModalOpen(true)}
                  onOpenEditCompany={(company) => setEditCompanyTarget(company)}
                  onOpenArchiveConfirm={(company) => setArchiveCompanyTarget(company)}
                />
              }
            />
            <Route
              path="/companies/:id"
              element={
                <CompanyDetailWrapper
                  refreshTick={refreshTick}
                  onBack={() => navigate('/companies')}
                  onOpenEdit={(company) => setEditCompanyTarget(company)}
                  onOpenArchiveConfirm={(company) => setArchiveCompanyTarget(company)}
                />
              }
            />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Modals & Dialogs */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleCompanyCreated}
      />

      <EditCompanyModal
        company={editCompanyTarget}
        isOpen={Boolean(editCompanyTarget)}
        onClose={() => setEditCompanyTarget(null)}
        onSuccess={(updated) => {
          handleCompanyUpdated(updated);
          setEditCompanyTarget(null);
        }}
      />

      <ArchiveConfirmDialog
        company={archiveCompanyTarget}
        isOpen={Boolean(archiveCompanyTarget)}
        onClose={() => setArchiveCompanyTarget(null)}
        onSuccess={(updated) => {
          handleCompanyArchiveChanged(updated);
          setArchiveCompanyTarget(null);
        }}
      />

      {/* Notification Toast System */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
