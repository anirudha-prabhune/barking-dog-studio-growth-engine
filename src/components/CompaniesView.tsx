import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Building2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Archive,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Globe,
  RotateCcw
} from 'lucide-react';
import { Company, CompanyStatus, OpportunityLevel, PaginatedCompanies } from '../types';
import { api } from '../lib/api';

interface CompaniesViewProps {
  onOpenCompanyDetail: (id: string) => void;
  onOpenAddCompany: () => void;
  onOpenEditCompany: (company: Company) => void;
  onOpenArchiveConfirm: (company: Company) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  onOpenCompanyDetail,
  onOpenAddCompany,
  onOpenEditCompany,
  onOpenArchiveConfirm
}) => {
  const [data, setData] = useState<PaginatedCompanies>({
    items: [],
    page: 1,
    page_size: 25,
    total: 0,
    total_pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getCompanies({
        search: debouncedSearch,
        industry: selectedIndustry !== 'ALL' ? selectedIndustry : undefined,
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        include_archived: includeArchived,
        page: currentPage,
        page_size: pageSize
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedIndustry, selectedCity, selectedStatus, includeArchived, currentPage, pageSize]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedIndustry('ALL');
    setSelectedCity('ALL');
    setIncludeArchived(false);
    setCurrentPage(1);
  };

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

  const getOpportunityBadge = (opp: OpportunityLevel | null | undefined) => {
    if (!opp) {
      return (
        <span className="text-[11px] text-slate-400 font-mono italic">
          Not Assessed
        </span>
      );
    }
    const colorMap: Record<OpportunityLevel, string> = {
      HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
      LOW: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${colorMap[opp]}`}
      >
        {opp}
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

  return (
    <div id="companies-module" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Companies Directory
            </h1>
            <span
              id="companies-count-badge"
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {data.total} {data.total === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Studio Barking Dog organization index • Searchable by name, domain, industry, and city
          </p>
        </div>

        <button
          id="button-add-company"
          onClick={onOpenAddCompany}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Debounced Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-company-search"
              type="text"
              placeholder="Search companies by name, domain, industry, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label htmlFor="filter-status" className="text-xs font-medium text-slate-600 shrink-0">
              Status:
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-44 text-xs border border-slate-300 rounded-md py-2 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="RESEARCHING">RESEARCHING</option>
              <option value="AUDITED">AUDITED</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="NURTURE">NURTURE</option>
            </select>
          </div>

          {/* Industry Filter */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label htmlFor="filter-industry" className="text-xs font-medium text-slate-600 shrink-0">
              Industry:
            </label>
            <select
              id="filter-industry"
              value={selectedIndustry}
              onChange={(e) => {
                setSelectedIndustry(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-48 text-xs border border-slate-300 rounded-md py-2 px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="ALL">All Industries</option>
              <option value="Industrial & Manufacturing">Manufacturing</option>
              <option value="Healthcare & Life Sciences">Healthcare</option>
              <option value="Retail & E-Commerce">Retail & E-Commerce</option>
              <option value="Transportation & Logistics">Logistics</option>
              <option value="Technology & Software">Software & Tech</option>
              <option value="Financial & Legal Services">Financial & Legal</option>
            </select>
          </div>
        </div>

        {/* Second Row: Archived Filter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
              <input
                id="checkbox-include-archived"
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => {
                  setIncludeArchived(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Include archived companies</span>
            </label>
          </div>

          {(searchTerm || selectedStatus !== 'ALL' || selectedIndustry !== 'ALL' || includeArchived) && (
            <button
              id="button-reset-filters"
              onClick={resetFilters}
              className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Companies Table or States */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <p className="text-xs font-medium">Loading database records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              onClick={loadCompanies}
              className="mt-3 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
            >
              Retry Query
            </button>
          </div>
        ) : data.items.length === 0 ? (
          <div id="companies-empty-state" className="p-16 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">
              {searchTerm || selectedStatus !== 'ALL' || selectedIndustry !== 'ALL'
                ? 'No matching companies found'
                : 'No companies yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedStatus !== 'ALL' || selectedIndustry !== 'ALL'
                ? 'Try adjusting your search terms or filter criteria.'
                : 'Add your first company to establish the intelligence baseline.'}
            </p>
            <div className="mt-4 flex items-center justify-center space-x-3">
              {(searchTerm || selectedStatus !== 'ALL' || selectedIndustry !== 'ALL') && (
                <button
                  onClick={resetFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={onOpenAddCompany}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Company</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="companies-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Company</th>
                  <th className="py-3 px-5">Industry</th>
                  <th className="py-3 px-5">Location</th>
                  <th className="py-3 px-5">Website</th>
                  <th className="py-3 px-5">CMS / Stack</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Opportunity</th>
                  <th className="py-3 px-5">Created</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.items.map((comp) => {
                  const locationParts = [comp.city, comp.state, comp.country].filter(Boolean);
                  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '—';

                  return (
                    <tr
                      key={comp.id}
                      id={`company-row-${comp.id}`}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        comp.is_archived ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Company Name & Domain */}
                      <td className="py-3 px-5">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onOpenCompanyDetail(comp.id)}
                            className="font-semibold text-slate-900 hover:text-amber-600 text-left transition-colors truncate max-w-[200px]"
                          >
                            {comp.name}
                          </button>
                          {comp.is_archived && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono font-medium bg-slate-200 text-slate-600">
                              Archived
                            </span>
                          )}
                        </div>
                        {comp.domain && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {comp.domain}
                          </div>
                        )}
                      </td>

                      {/* Industry */}
                      <td className="py-3 px-5 text-slate-600">
                        <div>{comp.industry || '—'}</div>
                        {comp.sub_industry && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {comp.sub_industry}
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-5 text-slate-600">
                        <div className="flex items-center space-x-1.5 truncate max-w-[150px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{locationStr}</span>
                        </div>
                      </td>

                      {/* Website */}
                      <td className="py-3 px-5">
                        <a
                          href={comp.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-mono text-[11px] underline decoration-slate-300 hover:decoration-slate-700"
                        >
                          <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[110px]">
                            {comp.domain || comp.website_url}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        </a>
                      </td>

                      {/* CMS / Tech Stack (Section 8) */}
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200">
                          Pass 2 Audit
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-5">
                        {getStatusBadge(comp.status)}
                      </td>

                      {/* Opportunity Level */}
                      <td className="py-3 px-5">
                        {getOpportunityBadge(comp.opportunity_level)}
                      </td>

                      {/* Created */}
                      <td className="py-3 px-5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(comp.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            id={`button-view-${comp.id}`}
                            onClick={() => onOpenCompanyDetail(comp.id)}
                            title="View Intelligence Record"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`button-edit-${comp.id}`}
                            onClick={() => onOpenEditCompany(comp)}
                            title="Edit Company Details"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`button-archive-${comp.id}`}
                            onClick={() => onOpenArchiveConfirm(comp)}
                            title={comp.is_archived ? 'Restore Company' : 'Archive Company'}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Controls (Section 8, 9) */}
        {data.total > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center space-x-3">
              <span>
                Showing{' '}
                <strong className="text-slate-900">
                  {Math.min((data.page - 1) * data.page_size + 1, data.total)}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900">
                  {Math.min(data.page * data.page_size, data.total)}
                </strong>{' '}
                of <strong className="text-slate-900">{data.total}</strong> companies
              </span>

              {/* Page size selector */}
              <div className="flex items-center space-x-1.5 ml-3 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center space-x-2">
              <button
                id="pagination-prev"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1 || isLoading}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-2 font-mono text-[11px] text-slate-500">
                Page {data.page} of {Math.max(1, data.total_pages)}
              </span>

              <button
                id="pagination-next"
                onClick={() => setCurrentPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={data.page >= data.total_pages || isLoading}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
