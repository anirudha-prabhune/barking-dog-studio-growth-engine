import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Globe,
  ExternalLink,
  MapPin,
  Calendar,
  Linkedin,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  FileSearch,
  Radio,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  History,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Company, CompanyStatus, OpportunityLevel, Activity } from '../types';
import { api } from '../lib/api';

interface CompanyDetailViewProps {
  companyId: string;
  onBack: () => void;
  onOpenEdit: (company: Company) => void;
  onOpenArchiveConfirm: (company: Company) => void;
}

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({
  companyId,
  onBack,
  onOpenEdit,
  onOpenArchiveConfirm
}) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'activity'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCompany(companyId);
      setCompany(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch company details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

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
        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${
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
        <span className="text-xs text-slate-400 font-mono italic px-2 py-1 bg-slate-50 border border-slate-200 rounded">
          Opportunity: Not Assessed
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
        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${colorMap[opp]}`}
      >
        Opportunity: {opp}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-sm font-medium">Loading company intelligence record...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-lg space-y-3">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="font-semibold text-sm">Failed to load company</h3>
          </div>
          <p className="text-xs text-rose-700">{error || 'Record not found'}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 text-rose-900 rounded-md hover:bg-rose-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Companies</span>
          </button>
        </div>
      </div>
    );
  }

  const locationParts = [company.city, company.state, company.country].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';

  return (
    <div id="company-detail-page" className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          id="button-back-to-companies"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Companies Directory</span>
        </button>

        {company.is_archived && (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-medium">
            <Archive className="w-3.5 h-3.5" />
            <span>This company is currently archived</span>
          </div>
        )}
      </div>

      {/* Hero Record Header (Section 14) */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {company.name}
              </h1>
              {getStatusBadge(company.status)}
              {getOpportunityBadge(company.opportunity_level)}
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500">
              {/* Website */}
              <a
                href={company.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 font-mono underline decoration-slate-300 hover:decoration-slate-700"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>{company.website_url}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              {/* Industry */}
              {company.industry && (
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {company.industry}
                    {company.sub_industry && ` • ${company.sub_industry}`}
                  </span>
                </div>
              )}

              {/* Location */}
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{locationStr}</span>
              </div>
            </div>
          </div>

          {/* Actions: Edit & Archive */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="detail-button-edit"
              onClick={() => onOpenEdit(company)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Company</span>
            </button>

            <button
              id="detail-button-archive"
              onClick={() => onOpenArchiveConfirm(company)}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors shadow-2xs ${
                company.is_archived
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              {company.is_archived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Restore from Archive</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Archive</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Section 14: Overview, Intelligence, Activity) */}
        <div className="flex border-b border-slate-200 mt-6 -mb-6 space-x-6 text-xs font-semibold">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            id="tab-intelligence"
            onClick={() => setActiveTab('intelligence')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'intelligence'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Intelligence</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Pass 2/3
            </span>
          </button>

          <button
            id="tab-activity"
            onClick={() => setActiveTab('activity')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'activity'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity Timeline</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
              {company.activities?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Overview Tab (Section 14) */}
      {activeTab === 'overview' && (
        <div id="tab-content-overview" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Company Description
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {company.description || 'No description entered for this organization.'}
              </p>
            </div>

            {/* Core Metadata Grid */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Firmographic Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Primary Domain</span>
                  <span className="font-mono font-medium text-slate-800 mt-0.5 block">
                    {company.domain || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Industry</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {company.industry || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Sub-industry</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {company.sub_industry || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Employee Range</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {company.employee_range || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Revenue Range</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {company.revenue_range || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Location Breakdown</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {locationStr}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Rail Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Online Presence
              </h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Website URL</span>
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-slate-900 hover:text-amber-600 truncate block mt-0.5"
                  >
                    {company.website_url}
                  </a>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">LinkedIn Profile</span>
                  {company.linkedin_url ? (
                    <a
                      href={company.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-blue-700 hover:text-blue-900 font-medium mt-0.5"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>View LinkedIn Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No LinkedIn profile provided</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-3 text-xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                System Record Audit
              </h2>
              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Record ID:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[150px]">
                    {company.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created:</span>
                  <span className="font-mono text-[11px]">{formatDate(company.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated:</span>
                  <span className="font-mono text-[11px]">{formatDate(company.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Intelligence Tab (Section 14: Placeholder only! No fake intelligence) */}
      {activeTab === 'intelligence' && (
        <div id="tab-content-intelligence" className="space-y-6">
          <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-lg flex items-start space-x-3 text-amber-900">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wider">
                Intelligence not yet available.
              </h3>
              <p className="text-xs text-amber-800/90 mt-1">
                Per Pass 1 specifications, automated lead intelligence, crawling, signals detection, and AI opportunity scoring will be introduced in subsequent passes (Pass 2: Website Intelligence, Pass 3: Signals & Research Agents).
              </p>
            </div>
          </div>

          {/* Disabled Placeholder Cards as mandated by Section 14 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Website Audit */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-lg opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded bg-slate-200/70 text-slate-500">
                  <FileSearch className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                  Pass 2 Agent
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-700">Website Audit</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Crawls digital storefront to assess technology stack, CMS detection, Core Web Vitals, and conversion architecture.
              </p>
            </div>

            {/* Business Signals */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-lg opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded bg-slate-200/70 text-slate-500">
                  <Radio className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                  Pass 3 Agent
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-700">Business Signals</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Detects commercial expansion, leadership hires, brand redesign triggers, and capital expenditure indicators.
              </p>
            </div>

            {/* Research Report */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-lg opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded bg-slate-200/70 text-slate-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                  Pass 3 Agent
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-700">Deep Business Research</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Analyzes strategic positioning, competitive weaknesses, and digital services readiness.
              </p>
            </div>

            {/* Opportunity Assessment */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-lg opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded bg-slate-200/70 text-slate-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                  Pass 3 Agent
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-700">Opportunity Assessment</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Calculates digital service opportunity score and matches Studio Barking Dog case studies to target pain points.
              </p>
            </div>

            {/* Key Contacts */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-lg opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded bg-slate-200/70 text-slate-500">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                  Pass 4 Agent
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-700">Key Contacts & Decision Makers</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Identifies Heads of Marketing, Chief Technology Officers, and Founders for personalized outreach.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Activity Tab (Section 14 & 24: Real activities from database) */}
      {activeTab === 'activity' && (
        <div id="tab-content-activity" className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                System Activity Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail for company lifecycle transitions and future agent execution records
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {company.activities?.length || 0} Events Recorded
            </span>
          </div>

          {!company.activities || company.activities.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No activity logged for this company yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {company.activities.map((act) => {
                let parsedMetadata: any = null;
                if (act.metadata_json) {
                  try {
                    parsedMetadata = JSON.parse(act.metadata_json);
                  } catch {
                    parsedMetadata = act.metadata_json;
                  }
                }

                return (
                  <div
                    key={act.id}
                    id={`activity-item-${act.id}`}
                    className="flex items-start space-x-3 text-xs p-3 rounded-md bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-full bg-slate-200 text-slate-700 mt-0.5 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-semibold text-slate-800">
                          {act.activity_type.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatDate(act.created_at)}
                        </span>
                      </div>

                      <p className="text-slate-600 mt-0.5 leading-normal">
                        {act.description}
                      </p>

                      <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-400">
                        <span>Initiated by: <strong className="text-slate-600">{act.created_by}</strong></span>
                      </div>

                      {parsedMetadata && (
                        <div className="mt-2 p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 overflow-x-auto">
                          <pre>{JSON.stringify(parsedMetadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
