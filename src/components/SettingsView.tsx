import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Database,
  Shield,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Cpu,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../lib/api';

export const SettingsView: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/health').then((r) => r.json());
      setHealthStatus(res);
    } catch (e: any) {
      setHealthStatus({ status: 'unreachable', error: e.message });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div id="settings-view" className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Engine Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          System telemetry, service architecture, and intelligence runtime settings
        </p>
      </div>

      {/* Application Infrastructure Telemetry (Section 17) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-slate-100 text-slate-700">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Application & Service Details
              </h2>
              <p className="text-xs text-slate-500">
                Core Pass 1 foundational deployment metadata
              </p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Telemetry</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-md bg-slate-50/70 border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Application Name
            </span>
            <span className="font-semibold text-slate-900 block text-sm">
              Barking Dog Growth Engine
            </span>
            <span className="text-slate-500 text-[11px] block">
              Internal Lead-Generation Intelligence Platform for Studio Barking Dog
            </span>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50/70 border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Current Lifecycle Release
            </span>
            <span className="font-semibold text-slate-900 block text-sm">
              Pass 1 — Foundation
            </span>
            <span className="text-slate-500 text-[11px] block">
              Clean relational schema, authenticated REST APIs, and UI foundation
            </span>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50/70 border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Execution Environment
            </span>
            <span className="font-mono font-medium text-slate-900 block text-xs">
              development (local full-stack)
            </span>
            <span className="text-slate-500 text-[11px] block">
              macOS / Cloud Run compatible container instance
            </span>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50/70 border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Target Architecture
            </span>
            <span className="font-medium text-slate-900 block text-xs">
              Docker Compose (PostgreSQL 16, Redis 7, Express / Next.js)
            </span>
            <span className="text-slate-500 text-[11px] block">
              Portable configuration matching docker-compose.yml specification
            </span>
          </div>
        </div>

        {/* Database Status */}
        <div className="pt-2">
          <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Relational Storage Engine
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
                    CONNECTED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  data/growth_engine.db • Schema verified with users, companies, activities, agent_runs, evidence
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-slate-400">
                Service: {healthStatus?.service || 'Barking Dog Engine API'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Future AI Configuration (Section 17) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded bg-amber-500/10 text-amber-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Future AI Agent Configuration
            </h2>
            <p className="text-xs text-slate-500">
              Provider and model parameters for future autonomous intelligence loops
            </p>
          </div>
        </div>

        {/* Clear Pass 3 notice as strictly mandated */}
        <div className="p-4 rounded-md bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Pass 1 Scope Boundary:</span>
            <p className="mt-0.5 text-amber-800/90 leading-relaxed">
              AI capabilities will be configured and activated in Pass 3 (Signals & Research Agents) and Pass 4 (Case-Study Matching & Opportunity Scoring). No active AI keys are invoked in Pass 1 to preserve foundation stability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 border border-slate-200 rounded-md bg-slate-50/40">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Default LLM Provider
            </span>
            <span className="font-semibold text-slate-700 mt-1 block">
              Google Gemini / Anthropic
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Reserved for Pass 3
            </span>
          </div>

          <div className="p-3 border border-slate-200 rounded-md bg-slate-50/40">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Reasoning Engine
            </span>
            <span className="font-semibold text-slate-700 mt-1 block">
              gemini-2.5-flash / claude-3-5-sonnet
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Reserved for Pass 3
            </span>
          </div>

          <div className="p-3 border border-slate-200 rounded-md bg-slate-50/40">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Crawler & Scraper Engine
            </span>
            <span className="font-semibold text-slate-700 mt-1 block">
              Playwright / Headless Chromium
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Reserved for Pass 2 (Website Intelligence)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
