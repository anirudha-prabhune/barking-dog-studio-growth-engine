import React, { useState } from 'react';
import { AlertTriangle, Archive, RotateCcw, RefreshCw } from 'lucide-react';
import { Company } from '../types';
import { api } from '../lib/api';

interface ArchiveConfirmDialogProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCompany: Company) => void;
}

export const ArchiveConfirmDialog: React.FC<ArchiveConfirmDialogProps> = ({
  company,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !company) return null;

  const isArchived = company.is_archived;

  const handleAction = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      let res: Company;
      if (isArchived) {
        res = await api.restoreCompany(company.id);
      } else {
        res = await api.archiveCompany(company.id);
      }
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="modal-archive-confirm"
        className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4"
      >
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              isArchived ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            {isArchived ? <RotateCcw className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {isArchived ? 'Restore Company from Archive' : 'Archive Company Record'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {isArchived
                ? `Are you sure you want to restore '${company.name}' back to the active directory?`
                : `Are you sure you want to archive '${company.name}'? It will be hidden from default views and exclude future automated processing, but can be restored at any time.`}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            id="button-confirm-archive-action"
            type="button"
            onClick={handleAction}
            disabled={isProcessing}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white rounded-md shadow-xs transition-colors disabled:opacity-50 ${
              isArchived
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isProcessing ? 'Processing...' : isArchived ? 'Restore Record' : 'Archive Company'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
