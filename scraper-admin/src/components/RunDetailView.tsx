import React from 'react';
import {
  ChevronLeft,
  Play,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Terminal,
  Layers,
  FileText,
} from 'lucide-react';
import { RunItem, NavTab } from '../types';

interface RunDetailViewProps {
  run: RunItem;
  onNavigate: (tab: NavTab, sourceId?: string) => void;
  onRunNow: (sourceId: string) => void;
}

export const RunDetailView: React.FC<RunDetailViewProps> = ({
  run,
  onNavigate,
  onRunNow,
}) => {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-[#787774]">
        <button
          onClick={() => onNavigate('runs')}
          className="flex items-center gap-1 text-[#37352f] hover:bg-[#efefed] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Execution History</span>
        </button>
        <span>/</span>
        <span className="font-semibold text-[#37352f]">Run #{run.id}</span>
      </div>

      {/* Notion Page Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">🔍</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
                {run.source} Execution
              </h1>
              <span className="inline-flex items-center gap-1 rounded bg-[#e6f4ea] px-2 py-0.5 text-xs font-semibold text-[#137333] border border-[#ceead6]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {run.status}
              </span>
            </div>
            <p className="text-xs font-mono text-[#787774] mt-1.5">
              Execution ID: #{run.id} · Started {run.startedAt}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('source-detail', run.source.toLowerCase())}
              className="flex items-center gap-1.5 rounded-md border border-[#e9e9e8] bg-white px-3 py-1.5 text-xs text-[#37352f] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-[#787774]" />
              <span>Source Config</span>
            </button>
            <button
              onClick={() => onRunNow(run.source.toLowerCase())}
              className="flex items-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Retry Run</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Notion Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-[#e9e9e8] bg-white p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">Found</p>
          <p className="text-2xl font-bold font-mono text-[#37352f]">{run.found}</p>
          <p className="text-[11px] text-[#787774]">Extracted DOM items</p>
        </div>

        <div className="rounded-md border border-[#e9e9e8] bg-white p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">Inserted</p>
          <p className="text-2xl font-bold font-mono text-[#137333]">{run.inserted}</p>
          <p className="text-[11px] text-[#137333]">New DB records</p>
        </div>

        <div className="rounded-md border border-[#e9e9e8] bg-white p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">Updated</p>
          <p className="text-2xl font-bold font-mono text-[#183347]">{run.updated}</p>
          <p className="text-[11px] text-[#183347]">Refreshed items</p>
        </div>

        <div className="rounded-md border border-[#e9e9e8] bg-white p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">Skipped/Rejected</p>
          <p className="text-2xl font-bold font-mono text-[#5d1715]">{run.skippedRejected}</p>
          <p className="text-[11px] text-[#5d1715]">Filter / Geo mismatch</p>
        </div>
      </div>

      {/* DOM Selector Health Callout */}
      <div className="rounded-md border border-[#e9e9e8] bg-white p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#137333]" />
            <h3 className="text-xs font-bold text-[#37352f] uppercase tracking-wider">
              DOM Selector Health & Parsing Accuracy
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-[#e6f4ea] px-2 py-0.5 text-xs font-semibold text-[#137333]">
            98% Accuracy Rate
          </span>
        </div>

        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-[#f7f6f3] overflow-hidden border border-[#e9e9e8]">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${run.selectorRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Execution Logs Terminal */}
      <div className="rounded-md border border-[#e9e9e8] bg-white overflow-hidden space-y-0">
        <div className="bg-[#f7f6f3] px-4 py-2.5 border-b border-[#e9e9e8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#787774]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#37352f]">
              Process Execution Logs
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#787774]">
            {run.logs.length} logged events
          </span>
        </div>

        <div className="p-4 bg-[#202020] text-[#f7f6f3] font-mono text-xs space-y-2 max-h-96 overflow-y-auto">
          {run.logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-3 leading-relaxed">
              <span className="text-gray-400 shrink-0">{log.timestamp}</span>
              <span
                className={`font-bold shrink-0 ${
                  log.level === 'INFO'
                    ? 'text-emerald-400'
                    : log.level === 'WARN'
                    ? 'text-amber-300'
                    : 'text-red-400'
                }`}
              >
                [{log.level}]
              </span>
              <span className="text-gray-100">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

