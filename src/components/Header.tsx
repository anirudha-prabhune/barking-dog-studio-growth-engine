import React from 'react';
import { Plus } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onOpenAddCompany: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenAddCompany
}) => {
  const getTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Intelligence Dashboard';
      case 'companies':
        return 'Companies Directory';
      case 'company_detail':
        return 'Company Intelligence Record';
      case 'settings':
        return 'Engine Configuration';
      default:
        return 'Growth Engine';
    }
  };

  return (
    <header id="app-header" className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center space-x-3">
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
          {getTitle()}
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          Pass 1 • Foundation
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Quick action: Add Company */}
        <button
          id="header-button-add-company"
          onClick={onOpenAddCompany}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Company</span>
        </button>
      </div>
    </header>
  );
};
