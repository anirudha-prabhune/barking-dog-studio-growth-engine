import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileCode,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  FileSearch,
  ShieldAlert,
  Server,
  Code,
  Tag,
  Hash,
  Database,
  StopCircle
} from 'lucide-react';
import { WebsiteScan, WebsitePage, ScanStatus } from '../types';
import { api } from '../lib/api';

interface WebsiteIntelligenceSectionProps {
  companyId: string;
  websiteUrl: string;
  onRefreshCompany?: () => void;
}

export const WebsiteIntelligenceSection: React.FC<WebsiteIntelligenceSectionProps> = ({
  companyId,
  websiteUrl,
  onRefreshCompany
}) => {
  const [scans, setScans] = useState<WebsiteScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<WebsiteScan | null>(null);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [pagesLoading, setPagesLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectedPage, setInspectedPage] = useState<WebsitePage | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>(websiteUrl || '');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadScans = async (selectLatest: boolean = true) => {
    try {
      setError(null);
      const res = await api.getCompanyScans(companyId, 1, 20);
      setScans(res.items);

      if (res.items.length > 0) {
        const latest = res.items[0];
        if (selectLatest || !selectedScan) {
          setSelectedScan(latest);
          loadPages(latest.id);
        } else {
          // Update selected scan in place
          const updated = res.items.find(s => s.id === selectedScan.id) || latest;
          setSelectedScan(updated);
        }

        // Check if latest scan is still active
        const hasActive = res.items.some(
          s => s.status === 'RUNNING' || s.status === 'PENDING'
        );
        setIsScanning(hasActive);
      } else {
        setSelectedScan(null);
        setPages([]);
        setIsScanning(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load website intelligence scans.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPages = async (scanId: string) => {
    setPagesLoading(true);
    try {
      const res = await api.getScanPages(scanId, 1, 50);
      setPages(res.items);
    } catch (err: any) {
      console.error('Failed to load scan pages:', err);
    } finally {
      setPagesLoading(false);
    }
  };

  useEffect(() => {
    setCustomUrl(websiteUrl || '');
    loadScans(true);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [companyId, websiteUrl]);

  // Polling effect while scan is running
  useEffect(() => {
    if (isScanning && selectedScan) {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        try {
          const updated = await api.getScanDetails(selectedScan.id);
          setSelectedScan(updated);

          if (updated.status === 'COMPLETED' || updated.status === 'FAILED' || updated.status === 'CANCELLED') {
            setIsScanning(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            loadScans(false);
            loadPages(updated.id);
            if (onRefreshCompany) {
              onRefreshCompany();
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2500);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [isScanning, selectedScan?.id]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const newScan = await api.triggerWebsiteScan(companyId, customUrl || undefined);
      setSelectedScan(newScan);
      await loadScans(false);
      loadPages(newScan.id);
    } catch (err: any) {
      setIsScanning(false);
      setError(err.message || 'Failed to trigger website intelligence scan.');
    }
  };

  const handleCancelScan = async () => {
    if (!selectedScan) return;
    try {
      const cancelled = await api.cancelScan(selectedScan.id);
      setSelectedScan(cancelled);
      setIsScanning(false);
      await loadScans(false);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel scan.');
    }
  };

  const handleInspectPage = async (pageId: string) => {
    if (!selectedScan) return;
    setInspectLoading(true);
    try {
      const fullPage = await api.getScanPageDetail(selectedScan.id, pageId);
      setInspectedPage(fullPage);
    } catch (err: any) {
      setError(err.message || 'Failed to load page audit details.');
    } finally {
      setInspectLoading(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status: ScanStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>COMPLETED</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>CRAWLING</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>QUEUED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>FAILED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <StopCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Scan Trigger Control */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700 border border-amber-200/60 mt-0.5">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Website Intelligence Infrastructure
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800">
                  Pass 2A Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Deterministic web intelligence engine: SSRF-hardened bounded crawler, robots.txt & sitemap discovery, DOM extraction, and verified technology stack detection.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {isScanning ? (
              <button
                type="button"
                onClick={handleCancelScan}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Cancel Scan</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleStartScan}
              disabled={isScanning || !customUrl}
              className={`inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white rounded-md shadow-xs transition-colors ${
                isScanning || !customUrl
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Crawling Website...' : 'Run Website Scan'}</span>
            </button>
          </div>
        </div>

        {/* Target URL Input / Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isScanning}
              className="block w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
            />
          </div>

          {scans.length > 1 && (
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs text-slate-500">Scan History:</span>
              <select
                value={selectedScan?.id || ''}
                onChange={(e) => {
                  const s = scans.find(item => item.id === e.target.value);
                  if (s) {
                    setSelectedScan(s);
                    loadPages(s.id);
                  }
                }}
                disabled={isScanning}
                className="text-xs py-1.5 px-2.5 border border-slate-300 rounded-md bg-white text-slate-700 font-mono"
              >
                {scans.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    #{scans.length - idx} • {formatDate(s.started_at)} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-md flex items-start space-x-2.5 text-xs text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Scan Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Scan Content */}
      {selectedScan ? (
        <div className="space-y-6">
          {/* Scan Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">Status</span>
              <div className="mt-1.5">{getStatusBadge(selectedScan.status)}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">HTTP Response</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-1.5 block">
                {selectedScan.http_status ? `${selectedScan.http_status} OK` : '—'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">Pages Crawled</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-1.5 block">
                {selectedScan.pages_fetched} / {selectedScan.pages_discovered} discovered
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">Duration</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-1.5 block">
                {selectedScan.duration_ms ? `${(selectedScan.duration_ms / 1000).toFixed(2)}s` : 'In progress...'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">Robots.txt</span>
              <span className="text-xs font-mono font-medium text-slate-700 mt-1.5 block">
                {selectedScan.robots_txt_status || 'Checking...'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">Sitemap.xml</span>
              <span className="text-xs font-mono font-medium text-slate-700 mt-1.5 block">
                {selectedScan.sitemap_found ? 'Discovered & Parsed' : 'Not Found'}
              </span>
            </div>
          </div>

          {/* Target & Final URL Display */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-slate-400">Target URL:</span>
                <span className="text-slate-800 font-semibold">{selectedScan.target_url}</span>
              </div>
              {selectedScan.final_url && (
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-slate-400">Final Resolved Destination:</span>
                  <a
                    href={selectedScan.final_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 hover:text-amber-900 inline-flex items-center space-x-1 underline font-semibold"
                  >
                    <span>{selectedScan.final_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {selectedScan.error_message && (
              <div className="pt-2 text-rose-700 text-xs font-mono border-t border-slate-100">
                Error Details: {selectedScan.error_message}
              </div>
            )}
          </div>

          {/* Section: Detected Technology Stack */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Detected Technology Stack & Digital Footprint
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {selectedScan.technologies?.length || 0} Technologies Verified
              </span>
            </div>

            {selectedScan.technologies && selectedScan.technologies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedScan.technologies.map((tech, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-900">
                        <Code className="w-3.5 h-3.5 text-amber-600" />
                        <span>{tech.technology}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {(tech.confidence * 100).toFixed(0)}% Confident
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-normal">
                      {tech.evidence}
                    </p>

                    <div className="pt-1 text-[10px] font-mono text-slate-400 truncate">
                      Source: {tech.source_url}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                {isScanning
                  ? 'Analyzing HTML source, script containers, and HTTP response headers...'
                  : 'No standard third-party CMS or tracking signatures explicitly detected on scanned pages.'}
              </div>
            )}
          </div>

          {/* Section: Crawled Pages Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Crawled Web Pages ({pages.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Bounded depth crawl (Depth ≤ 2)
              </span>
            </div>

            {pagesLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-600 mb-2" />
                Loading crawled pages...
              </div>
            ) : pages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Depth</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Page Title & URL</th>
                      <th className="py-2.5 px-4">Words</th>
                      <th className="py-2.5 px-4">Discovered From</th>
                      <th className="py-2.5 px-4 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {pages.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {p.is_homepage ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Home (0)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                              Depth {p.depth}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {p.status_code ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.status_code === 200
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {p.status_code}
                            </span>
                          ) : (
                            <span className="text-rose-500 text-[10px]">ERR</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 max-w-md">
                          <div className="font-sans font-medium text-slate-900 truncate">
                            {p.title || 'Untitled Document'}
                          </div>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-500 hover:text-amber-600 truncate block mt-0.5"
                          >
                            {p.url}
                          </a>
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                          {p.word_count.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-400 max-w-[150px] truncate text-[11px]">
                          {p.discovered_from || 'Direct Root'}
                        </td>

                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleInspectPage(p.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 rounded border border-slate-200 transition-colors font-sans"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                {isScanning ? 'Crawler is fetching internal pages...' : 'No pages recorded for this scan.'}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white p-12 text-center rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">
              No Website Scans Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Launch the deterministic Pass 2A crawler to analyze digital storefront architecture, verify CMS and analytics technologies, and generate auditable evidence for this organization.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartScan}
            disabled={!customUrl}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Initiate First Website Scan</span>
          </button>
        </div>
      )}

      {/* Future Pass Roadmap Placeholders */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Future Agent Modules Roadmap
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                Pass 3 Agent
              </span>
            </div>
            <h5 className="text-xs font-semibold text-slate-700">Commercial Signals Detection</h5>
            <p className="text-[11px] text-slate-500 mt-1">
              Tracks executive hiring, digital transformation announcements, and corporate rebrands.
            </p>
          </div>

          <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                Pass 3 Agent
              </span>
            </div>
            <h5 className="text-xs font-semibold text-slate-700">Deep Business Research</h5>
            <p className="text-[11px] text-slate-500 mt-1">
              Evaluates competitive advantages, service offerings, and enterprise readiness.
            </p>
          </div>

          <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold">
                Pass 4 Agent
              </span>
            </div>
            <h5 className="text-xs font-semibold text-slate-700">Decision Makers & Contacts</h5>
            <p className="text-[11px] text-slate-500 mt-1">
              Identifies digital leads, VP of Engineering, and CMOs for targeted outbound engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Page Inspection Modal */}
      {inspectedPage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-0.5 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Depth {inspectedPage.depth}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                    HTTP {inspectedPage.status_code || 200}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {inspectedPage.title || 'Page Inspection'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {inspectedPage.url}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Core Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Language</span>
                  <span className="font-mono font-medium text-slate-800 mt-0.5 block">
                    {inspectedPage.language || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Word Count</span>
                  <span className="font-mono font-medium text-slate-800 mt-0.5 block">
                    {inspectedPage.word_count.toLocaleString()} words
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Canonical URL</span>
                  <span className="font-mono font-medium text-slate-800 mt-0.5 block truncate">
                    {inspectedPage.canonical_url || 'Self-referencing'}
                  </span>
                </div>
              </div>

              {/* Meta Description */}
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-500 block">Meta Description</span>
                <p className="bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed text-slate-800">
                  {inspectedPage.meta_description || 'No meta description tag discovered.'}
                </p>
              </div>

              {/* Headings */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase font-bold text-slate-500 block">H1 Primary Heading</span>
                <p className="bg-slate-50 p-3 rounded border border-slate-200 font-semibold text-slate-900">
                  {inspectedPage.h1 || 'No H1 heading found.'}
                </p>
              </div>

              {inspectedPage.h2_text && (
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-slate-500 block">H2 Subheadings</span>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 text-slate-700 whitespace-pre-line">
                    {inspectedPage.h2_text}
                  </div>
                </div>
              )}

              {/* Clean Extracted Text Preview */}
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-500 block">
                  Extracted Body Content Preview (Clean Visible Text)
                </span>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 max-h-48 overflow-y-auto leading-relaxed text-slate-700 whitespace-pre-wrap font-sans text-xs">
                  {inspectedPage.extracted_text || 'No textual content extracted.'}
                </div>
              </div>

              {/* Raw HTML Snapshot Preview */}
              {inspectedPage.html_snapshot && (
                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-bold text-slate-500 block">
                    HTML Snapshot Preview (Audit Snapshot)
                  </span>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded text-[11px] font-mono max-h-48 overflow-y-auto overflow-x-auto">
                    {inspectedPage.html_snapshot.slice(0, 3000)}
                    {inspectedPage.html_snapshot.length > 3000 && '\n\n... [truncated for display]'}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedPage(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
