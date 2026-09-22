import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileSearch,
  Radio,
  Sparkles,
  BookOpen,
  Briefcase,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onLogout
}) => {
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
    { id: 'companies', label: 'Companies', icon: Building2, enabled: true },
    { id: 'prospects', label: 'Prospects', icon: Users, enabled: false },
    { id: 'audits', label: 'Audits', icon: FileSearch, enabled: false },
    { id: 'signals', label: 'Signals', icon: Radio, enabled: false },
    { id: 'opportunities', label: 'Opportunities', icon: Sparkles, enabled: false },
    { id: 'research', label: 'Research', icon: BookOpen, enabled: false },
    { id: 'case_studies', label: 'Case Studies', icon: Briefcase, enabled: false },
  ];

  return (
    <aside
      id="sidebar-container"
      className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen select-none shrink-0"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
          BD
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <h1 className="text-sm font-semibold tracking-tight text-white truncate">
              Barking Dog
            </h1>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Growth Engine
          </p>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Core Platform
        </div>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'companies' && currentView === 'company_detail');

          if (!item.enabled) {
            return (
              <div
                key={item.id}
                id={`nav-item-${item.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-slate-500 cursor-not-allowed group opacity-60"
                title="Available in later intelligence passes"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                  Coming Soon
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          );
        })}

        {/* Divider */}
        <div className="pt-4 pb-2">
          <div className="border-t border-slate-800 my-1" />
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            System
          </div>
        </div>

        {/* Settings Navigation */}
        <button
          id="nav-item-settings"
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            currentView === 'settings'
              ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Settings className={`w-4 h-4 ${currentView === 'settings' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Settings</span>
          </div>
          {currentView === 'settings' && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-md bg-slate-800/60 border border-slate-800">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 text-xs font-semibold shrink-0">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate leading-tight">
                {currentUser?.name || 'Administrator'}
              </p>
              <div className="flex items-center space-x-1 text-[10px] text-slate-400 truncate">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Studio Barking Dog</span>
              </div>
            </div>
          </div>
          <button
            id="button-logout"
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
