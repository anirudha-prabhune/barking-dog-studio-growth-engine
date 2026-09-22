import React, { useState, useEffect } from 'react';
import { X, Edit2, AlertCircle, RefreshCw } from 'lucide-react';
import { Company, CompanyFormData, CompanyStatus, OpportunityLevel } from '../types';
import { api } from '../lib/api';

interface EditCompanyModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCompany: Company) => void;
}

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  company,
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

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        website_url: company.website_url || '',
        domain: company.domain || '',
        industry: company.industry || '',
        sub_industry: company.sub_industry || '',
        country: company.country || '',
        state: company.state || '',
        city: company.city || '',
        employee_range: company.employee_range || '',
        revenue_range: company.revenue_range || '',
        description: company.description || '',
        linkedin_url: company.linkedin_url || '',
        status: company.status || 'NEW',
        opportunity_level: company.opportunity_level || null
      });
      setErrorMessage(null);
    }
  }, [company]);

  if (!isOpen || !company) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Company Name is required.');
      return;
    }

    if (!formData.website_url.trim()) {
      setErrorMessage('Website URL is required.');
      return;
    }

    let normalizedWeb = formData.website_url.trim();
    if (!normalizedWeb.startsWith('http://') && !normalizedWeb.startsWith('https://')) {
      normalizedWeb = 'https://' + normalizedWeb;
    }
    try {
      new URL(normalizedWeb);
    } catch {
      setErrorMessage('Please enter a valid website address.');
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
      const updated = await api.updateCompany(company.id, {
        ...formData,
        website_url: normalizedWeb,
        opportunity_level: formData.opportunity_level ? formData.opportunity_level : null
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update company record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        id="modal-edit-company"
        className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-slate-100 text-slate-800">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Edit Company Record
              </h2>
              <p className="text-xs text-slate-500">
                Updating details for {company.name}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

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
                  id="edit-form-name"
                  name="name"
                  type="text"
                  required
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
                  id="edit-form-website-url"
                  name="website_url"
                  type="text"
                  required
                  value={formData.website_url}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Domain
                </label>
                <input
                  id="edit-form-domain"
                  name="domain"
                  type="text"
                  value={formData.domain || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  LinkedIn URL
                </label>
                <input
                  id="edit-form-linkedin-url"
                  name="linkedin_url"
                  type="text"
                  value={formData.linkedin_url || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

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
                  id="edit-form-industry"
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
                  id="edit-form-sub-industry"
                  name="sub_industry"
                  type="text"
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
                  id="edit-form-city"
                  name="city"
                  type="text"
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
                  id="edit-form-state"
                  name="state"
                  type="text"
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
                  id="edit-form-country"
                  name="country"
                  type="text"
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
                  id="edit-form-employee-range"
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
                  id="edit-form-revenue-range"
                  name="revenue_range"
                  type="text"
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
                id="edit-form-description"
                name="description"
                rows={3}
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              Lifecycle Stage & Opportunity Rating
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  id="edit-form-status"
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
                  Opportunity Level
                </label>
                <select
                  id="edit-form-opportunity-level"
                  name="opportunity_level"
                  value={formData.opportunity_level || ''}
                  onChange={handleChange}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Not Assessed</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              id="edit-form-submit"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
