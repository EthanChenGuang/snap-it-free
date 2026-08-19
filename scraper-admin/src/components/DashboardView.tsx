import React from 'react';
import {
  Play,
  Settings,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  Bell,
  Sparkles,
  Info,
} from 'lucide-react';
import { Source, AlertItem, NavTab, SystemConfig } from '../types';

interface DashboardViewProps {
  sources: Source[];
  alerts: AlertItem[];
  systemConfig: SystemConfig;
  onNavigate: (tab: NavTab, sourceId?: string) => void;
  onToggleSource: (sourceId: string) => void;
  onRunNow: (sourceId: string) => void;
  onDismissAlert: (alertId: string) => void;
  onTestAlert: () => void;
  pendingTranslationsCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sources,
  alerts,
  systemConfig,
  onNavigate,
  onToggleSource,
  onRunNow,
  onDismissAlert,
  onTestAlert,
  pendingTranslationsCount,
}) => {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Notion Page Icon & Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">📊</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
              Dashboard Overview
            </h1>
            <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
              Real-time worker telemetry, target crawler sources, and error routing logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('translation')}
              className="flex items-center gap-1.5 rounded-md bg-[#fdecc8] px-3 py-1.5 text-xs font-semibold text-[#402c1b] hover:bg-[#f9e2b1] transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-[#b06000]" />
              <span>Translation Queue:</span>
              <span className="font-bold underline">{pendingTranslationsCount}</span>
            </button>
            <button
              onClick={() => onNavigate('sources')}
              className="flex items-center gap-1.5 rounded-md border border-[#e9e9e8] bg-white px-3 py-1.5 text-xs font-medium text-[#37352f] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-[#787774]" />
              <span>All Sources</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notion Callout Box */}
      <div className="rounded-md border border-[#e9e9e8] bg-[#f7f6f3] p-4 flex items-start gap-3 text-xs leading-relaxed">
        <div className="text-base shrink-0">💡</div>
        <div className="space-y-1">
          <p className="font-semibold text-[#37352f]">
            Notion System Status & Auto-Translation Active
          </p>
          <p className="text-[#787774]">
            Worker Node #1 is active. Gemini 3.6 Flash Server API handles live translation of scraped listings. Search selectors are tested every run.
          </p>
        </div>
      </div>

      {/* Sources Gallery Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#e9e9e8] pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#37352f] uppercase tracking-wider">
            <span>🌐</span>
            <span>Integration Sources Database</span>
          </div>
          <button
            onClick={() => onNavigate('sources')}
            className="text-xs font-medium text-[#787774] hover:text-[#37352f] flex items-center gap-1 cursor-pointer"
          >
            Manage Sources
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => {
            return (
              <div
                key={source.id}
                className={`rounded-md border bg-white p-4 space-y-3 transition-all hover:shadow-xs ${
                  source.enabled ? 'border-[#e9e9e8]' : 'border-[#e9e9e8] bg-[#fbfbfa] opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {source.logoUrl ? (
                      <img
                        src={source.logoUrl}
                        alt={source.name}
                        className="h-7 w-7 object-contain rounded border border-[#e9e9e8] p-0.5 bg-white"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-[#f1f1ef] font-bold text-xs text-[#37352f]">
                        {source.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-xs text-[#37352f]">{source.name}</h3>
                      <div className="mt-0.5">
                        {source.status === 'Running' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#e6f4ea] px-1.5 py-0.2 text-[10px] font-semibold text-[#137333] border border-[#ceead6]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : source.status === 'Coming soon' ? (
                          <span className="inline-flex items-center rounded bg-[#e3e2e0] px-1.5 py-0.2 text-[10px] font-medium text-[#32302c]">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-[#e3e2e0] px-1.5 py-0.2 text-[10px] font-medium text-[#32302c]">
                            {source.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notion Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      disabled={!source.isSupported || systemConfig.globalPause}
                      onChange={() => onToggleSource(source.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-[#e3e2e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#37352f] peer-disabled:opacity-40"></div>
                  </label>
                </div>

                {/* Source details block */}
                <div className="text-xs text-[#787774] space-y-1 bg-[#f7f6f3] p-2.5 rounded border border-[#e9e9e8] font-mono">
                  <div className="flex justify-between">
                    <span>Interval:</span>
                    <span className="text-[#37352f] font-semibold">Every {source.interval}m</span>
                  </div>
                  {source.lastRun && (
                    <div className="flex justify-between">
                      <span>Last Run:</span>
                      <span className="text-[#37352f]">{source.lastRun}</span>
                    </div>
                  )}
                  {source.lastRunDetails && (
                    <div className="flex justify-between text-[#137333] font-semibold">
                      <span>Last Result:</span>
                      <span>{source.lastRunDetails.listingsCount} items</span>
                    </div>
                  )}
                </div>

                {/* Notion Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {source.isSupported ? (
                    <>
                      <button
                        onClick={() => onRunNow(source.id)}
                        disabled={systemConfig.globalPause}
                        className="flex-1 flex items-center justify-center gap-1 rounded bg-[#37352f] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Run Now
                      </button>
                      <button
                        onClick={() => onNavigate('source-detail', source.id)}
                        className="flex items-center justify-center rounded border border-[#e9e9e8] bg-white p-1.5 text-xs text-[#37352f] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
                        title="Configure Source"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="w-full text-center text-xs py-1 text-[#787774] font-medium bg-[#f1f1ef] rounded border border-[#e9e9e8]"
                    >
                      Planned Integration
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notion Alerts Callout Block */}
      <div className="rounded-md border border-[#e9e9e8] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#e9e9e8] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔔</span>
            <h2 className="text-xs font-bold text-[#37352f] uppercase tracking-wider">
              System Alerts & Routing ({alerts.length})
            </h2>
          </div>

          <button
            onClick={onTestAlert}
            className="text-xs font-semibold text-[#5a5a58] hover:text-[#37352f] border border-[#e9e9e8] px-2 py-1 rounded bg-[#f7f6f3] hover:bg-[#efefed] transition-colors cursor-pointer"
          >
            Trigger Test Alert
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#787774] bg-[#f7f6f3] rounded border border-dashed border-[#e9e9e8]">
            No active system alerts. All worker threads operating smoothly.
          </div>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded border border-[#f5c6cb] bg-[#ffe2dd] text-xs text-[#5d1715]"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-600 shrink-0"></span>
                  <span className="font-mono font-bold">{alert.source}:</span>
                  <span className="font-mono">{alert.message}</span>
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <span className="font-mono text-[11px] opacity-80">{alert.timestamp}</span>
                  <button
                    onClick={() => onDismissAlert(alert.id)}
                    className="text-[11px] font-semibold underline hover:opacity-100 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notion Key Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="rounded-md border border-[#e9e9e8] bg-white p-4 space-y-1">
          <p className="text-xs text-[#787774] font-medium uppercase tracking-wider">Inserted (24h)</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#37352f]">1,240</span>
            <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] px-1.5 py-0.5 rounded">
              +14.2%
            </span>
          </div>
          <p className="text-[11px] text-[#787774]">Unique database inserts</p>
        </div>

        <div className="rounded-md border border-[#e9e9e8] bg-white p-4 space-y-1">
          <p className="text-xs text-[#787774] font-medium uppercase tracking-wider">Failed Runs (7d)</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#37352f]">12</span>
            <span className="text-xs font-semibold text-[#5d1715] bg-[#ffe2dd] px-1.5 py-0.5 rounded">
              Proxy 403
            </span>
          </div>
          <p className="text-[11px] text-[#787774]">Automatically retried</p>
        </div>

        <div className="rounded-md border border-[#e9e9e8] bg-white p-4 space-y-1">
          <p className="text-xs text-[#787774] font-medium uppercase tracking-wider">Selector Accuracy</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#137333]">98.4%</span>
            <span className="text-xs font-semibold text-[#183347] bg-[#d3e5ef] px-1.5 py-0.5 rounded">
              Optimal
            </span>
          </div>
          <p className="text-[11px] text-[#787774]">DOM layout health score</p>
        </div>
      </div>
    </div>
  );
};

