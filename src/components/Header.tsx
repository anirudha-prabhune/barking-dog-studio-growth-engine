import React from 'react';
import { Plus, Database, Sparkles, Building2 } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentView: string;
  onOpenAddCompany: () => void;
  onSeedData: () => void;
  isSeeding?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenAddCompany,
  onSeedData,
  isSeeding
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
        {/* Quick action: Seed Demo Data */}
        <button
          id="button-seed-data"
          onClick={onSeedData}
          disabled={isSeeding}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors disabled:opacity-50"
          title="Seed fictional test records to local database"
        >
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>{isSeeding ? 'Seeding...' : 'Seed Demo Data'}</span>
        </button>

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
