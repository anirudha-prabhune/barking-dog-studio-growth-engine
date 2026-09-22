import React, { useState } from 'react';
import { X, Building2, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { CompanyFormData, CompanyStatus, OpportunityLevel } from '../types';
import { api } from '../lib/api';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCompanyId: string) => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    website_url: '',
    domain: '',
    industry: '',
    sub_industry: '',
    country: '',
    state: '',
    city: '',
    employee_range: '',
    revenue_range: '',
    description: '',
    linkedin_url: '',
    status: 'NEW',
    opportunity_level: null
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-populate domain if website is typed and domain is empty or matches prior auto
      if (name === 'website_url' && (!prev.domain || prev.domain === extractDomain(prev.website_url))) {
        const derived = extractDomain(value);
        if (derived) next.domain = derived;
      }
      return next;
    });
  };

  const extractDomain = (url: string): string => {
    try {
      let clean = url.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      const u = new URL(clean);
      let host = u.hostname;
      if (host.startsWith('www.')) host = host.substring(4);
      return host.toLowerCase();
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Frontend validation
    if (!formData.name.trim()) {
      setErrorMessage('Company Name is required.');
      return;
    }

    if (!formData.website_url.trim()) {
      setErrorMessage('Website URL is required.');
      return;
    }

    // URL format check
    let normalizedWeb = formData.website_url.trim();
    if (!normalizedWeb.startsWith('http://') && !normalizedWeb.startsWith('https://')) {
      normalizedWeb = 'https://' + normalizedWeb;
    }
    try {
      new URL(normalizedWeb);
    } catch {
      setErrorMessage('Please enter a valid website address (e.g. https://example.com).');
      return;
    }

    if (formData.linkedin_url && formData.linkedin_url.trim()) {
      let normLi = formData.linkedin_url.trim();
      if (!normLi.startsWith('http://') && !normLi.startsWith('https://')) {
        normLi = 'https://' + normLi;
      }
      if (!normLi.toLowerCase().includes('linkedin.com')) {
        setErrorMessage('LinkedIn URL must point to linkedin.com.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const created = await api.createCompany({
        ...formData,
        website_url: normalizedWeb,
        opportunity_level: formData.opportunity_level ? formData.opportunity_level : null
      });
      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save company record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        id="modal-add-company"
        className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-slate-900 text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Add Company to Intelligence Directory
              </h2>
              <p className="text-xs text-slate-500">
                Create a persistent organization record for Studio Barking Dog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Required Identifiers */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              Required Identifiers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Acme Robotics Ltd"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Website URL <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-website-url"
                  name="website_url"
                  type="text"
                  required
                  placeholder="e.g. https://acme-robotics.example.com"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Domain (Optional)
                </label>
                <input
                  id="form-domain"
                  name="domain"
                  type="text"
                  placeholder="e.g. acme-robotics.example.com"
                  value={formData.domain || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  LinkedIn URL (Optional)
                </label>
                <input
                  id="form-linkedin-url"
                  name="linkedin_url"
                  type="text"
                  placeholder="https://linkedin.com/company/acme"
                  value={formData.linkedin_url || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Industry & Firmographics */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              Firmographic Attributes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Industry
                </label>
                <select
                  id="form-industry"
                  name="industry"
                  value={formData.industry || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select industry...</option>
                  <option value="Industrial & Manufacturing">Industrial & Manufacturing</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                  <option value="Transportation & Logistics">Transportation & Logistics</option>
                  <option value="Technology & Software">Technology & Software</option>
                  <option value="Financial & Legal Services">Financial & Legal Services</option>
                  <option value="Professional Services">Professional Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sub-industry
                </label>
                <input
                  id="form-sub-industry"
                  name="sub_industry"
                  type="text"
                  placeholder="e.g. Telematics, B2B SaaS"
                  value={formData.sub_industry || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City
                </label>
                <input
                  id="form-city"
                  name="city"
                  type="text"
                  placeholder="e.g. London"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  State / Region
                </label>
                <input
                  id="form-state"
                  name="state"
                  type="text"
                  placeholder="e.g. Greater London"
                  value={formData.state || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Country
                </label>
                <input
                  id="form-country"
                  name="country"
                  type="text"
                  placeholder="e.g. United Kingdom"
                  value={formData.country || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Employee Range
                </label>
                <select
                  id="form-employee-range"
                  name="employee_range"
                  value={formData.employee_range || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select employee count...</option>
                  <option value="1-9">1-9 employees</option>
                  <option value="10-49">10-49 employees</option>
                  <option value="50-249">50-249 employees</option>
                  <option value="250-999">250-999 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Revenue Range
                </label>
                <input
                  id="form-revenue-range"
                  name="revenue_range"
                  type="text"
                  placeholder="e.g. £5M - £15M or $10M+"
                  value={formData.revenue_range || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                id="form-description"
                name="description"
                rows={3}
                placeholder="Brief summary of digital product offerings, operations, or target market..."
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Section: Status & Opportunity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              Initial Lifecycle Stage
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  id="form-status"
                  name="status"
                  value={formData.status || 'NEW'}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Opportunity Level (Optional)
                </label>
                <select
                  id="form-opportunity-level"
                  name="opportunity_level"
                  value={formData.opportunity_level || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Not Assessed (Default for Pass 1)</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              id="form-submit-add-company"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Add Company'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
