import React, { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  Sparkles,
  AlertCircle,
  Plus,
  ArrowRight,
  ExternalLink,
  Globe,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { DashboardStats, Company, CompanyStatus } from '../types';
import { api } from '../lib/api';

interface DashboardViewProps {
  onNavigateToCompanies: () => void;
  onOpenCompanyDetail: (id: string) => void;
  onOpenAddCompany: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToCompanies,
  onOpenCompanyDetail,
  onOpenAddCompany
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, recentData] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentCompanies(8)
      ]);
      setStats(statsData);
      setRecentCompanies(recentData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics from database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: CompanyStatus) => {
    const styleMap: Record<CompanyStatus, string> = {
      NEW: 'bg-blue-50 text-blue-700 border-blue-200',
      RESEARCHING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      AUDITED: 'bg-purple-50 text-purple-700 border-purple-200',
      QUALIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      NEEDS_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
      APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
      REJECTED: 'bg-slate-100 text-slate-600 border-slate-200',
      NURTURE: 'bg-sky-50 text-sky-700 border-sky-200'
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
          styleMap[status] || 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-sm font-medium">Querying database for live metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-view" className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Growth Engine Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Studio Barking Dog internal intelligence repository • Real-time database metrics
          </p>
        </div>

        {/* Quick Actions (Section 7) */}
        <div className="flex items-center space-x-3">
          <button
            id="dashboard-action-view-companies"
            onClick={onNavigateToCompanies}
            className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>View Companies</span>
          </button>
          <button
            id="dashboard-action-add-company"
            onClick={onOpenAddCompany}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* 4 Database-Calculated Metric Cards (Section 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Companies */}
        <div
          id="metric-total-companies"
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Companies
            </span>
            <div className="p-2 rounded bg-slate-100 text-slate-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.total_companies ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active records in database
            </p>
          </div>
        </div>

        {/* New Companies */}
        <div
          id="metric-new-companies"
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              New Companies
            </span>
            <div className="p-2 rounded bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.new_companies ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Status = NEW lifecycle stage
            </p>
          </div>
        </div>

        {/* Opportunities */}
        <div
          id="metric-opportunities"
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Opportunities
            </span>
            <div className="p-2 rounded bg-emerald-50 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.opportunities ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Qualified with opportunity rating
            </p>
          </div>
        </div>

        {/* Needs Review */}
        <div
          id="metric-needs-review"
          className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Needs Review
            </span>
            <div className="p-2 rounded bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.needs_review ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Requiring human review
            </p>
          </div>
        </div>
      </div>

      {/* Recent Companies Section (Section 7) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              Recent Companies
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recently ingested organizations awaiting or undergoing intelligence passes
            </p>
          </div>
          <button
            onClick={onNavigateToCompanies}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No companies yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your first company or run the seed command to populate demo records.
            </p>
            <button
              onClick={onOpenAddCompany}
              className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Company</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Company</th>
                  <th className="py-3 px-6">Industry</th>
                  <th className="py-3 px-6">Location</th>
                  <th className="py-3 px-6">Website</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentCompanies.map((comp) => {
                  const locationParts = [comp.city, comp.state, comp.country].filter(Boolean);
                  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '—';

                  return (
                    <tr
                      key={comp.id}
                      id={`recent-company-row-${comp.id}`}
                      onClick={() => onOpenCompanyDetail(comp.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Company Name & Domain */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                          {comp.name}
                        </div>
                        {comp.domain && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {comp.domain}
                          </div>
                        )}
                      </td>

                      {/* Industry */}
                      <td className="py-3.5 px-6 text-slate-600">
                        {comp.industry || '—'}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-6 text-slate-600">
                        <div className="flex items-center space-x-1.5 truncate max-w-[180px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{locationStr}</span>
                        </div>
                      </td>

                      {/* Website */}
                      <td className="py-3.5 px-6">
                        <a
                          href={comp.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-mono text-[11px] underline decoration-slate-300 hover:decoration-slate-700"
                        >
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">
                            {comp.domain || comp.website_url}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        {getStatusBadge(comp.status)}
                      </td>

                      {/* Added */}
                      <td className="py-3.5 px-6 text-right text-slate-400 font-mono text-[11px]">
                        {formatDate(comp.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
