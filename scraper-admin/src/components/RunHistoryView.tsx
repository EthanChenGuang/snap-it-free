import React, { useState } from 'react';
import {
  History,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import { RunItem, NavTab } from '../types';

interface RunHistoryViewProps {
  runs: RunItem[];
  onNavigate: (tab: NavTab, runId?: string) => void;
  onClearHistory: () => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({
  runs,
  onNavigate,
  onClearHistory,
}) => {
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filteredRuns = runs.filter((run) => {
    if (selectedSource !== 'All' && run.source.toLowerCase() !== selectedSource.toLowerCase()) {
      return false;
    }
    if (selectedStatus !== 'All' && run.status.toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Notion Page Icon & Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">📜</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
              Run History
            </h1>
            <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
              Execution logs, extraction metrics, and DOM selector accuracy across past runs.
            </p>
          </div>

          <button
            onClick={onClearHistory}
            className="text-xs text-[#787774] hover:text-[#37352f] hover:underline font-mono cursor-pointer"
          >
            Clear Run Logs
          </button>
        </div>
      </div>

      {/* Database Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f7f6f3] p-2.5 rounded-md border border-[#e9e9e8]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-[#787774] font-semibold uppercase tracking-wider mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="rounded-md border border-[#e9e9e8] bg-white px-2.5 py-1 text-xs text-[#37352f] focus:border-[#37352f] focus:outline-none cursor-pointer"
          >
            <option value="All">All Sources</option>
            <option value="Subito">Subito</option>
            <option value="Immobiliare">Immobiliare</option>
            <option value="Facebook">Facebook</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-[#e9e9e8] bg-white px-2.5 py-1 text-xs text-[#37352f] focus:border-[#37352f] focus:outline-none cursor-pointer"
          >
            <option value="All">Any Status</option>
            <option value="Success">Success / Completed</option>
            <option value="Failed">Failed</option>
            <option value="Running">Running</option>
          </select>
        </div>

        <div className="text-xs text-[#787774] font-mono">
          <span className="bg-[#e3e2e0] text-[#32302c] px-2 py-0.5 rounded font-semibold text-[11px]">
            {filteredRuns.length} runs
          </span>
        </div>
      </div>

      {/* Database View Table */}
      <div className="rounded-md border border-[#e9e9e8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#37352f]">
            <thead className="bg-[#f7f6f3] text-[11px] font-semibold text-[#787774] uppercase tracking-wider border-b border-[#e9e9e8]">
              <tr>
                <th className="px-4 py-2.5">Run ID</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Started At</th>
                <th className="px-4 py-2.5">Duration</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Found</th>
                <th className="px-4 py-2.5 text-right">Inserted</th>
                <th className="px-4 py-2.5 text-right">Rejected</th>
                <th className="px-4 py-2.5 text-right">Selector Rate</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e8]">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-xs text-[#787774]">
                    No run logs match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-[#f7f6f3] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#37352f]">
                      #{run.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#37352f]">
                      {run.source}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#787774]">
                      {run.startedAt}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#787774]">
                      {run.duration}
                    </td>
                    <td className="px-4 py-3">
                      {run.status === 'Success' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#e6f4ea] px-2 py-0.5 text-[10px] font-semibold text-[#137333] border border-[#ceead6]">
                          <CheckCircle2 className="h-3 w-3" />
                          Success
                        </span>
                      ) : run.status === 'Running' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#deebff] px-2 py-0.5 text-[10px] font-semibold text-[#0747a6] border border-[#b3d4ff]">
                          <RefreshCcw className="h-3 w-3 animate-spin" />
                          Running
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-[#ffe2dd] px-2 py-0.5 text-[10px] font-semibold text-[#5d1715] border border-[#f5c6cb]">
                          <AlertTriangle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#37352f]">
                      {run.found}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#137333]">
                      {run.inserted}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#5d1715]">
                      {run.skippedRejected}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className="font-semibold text-[#137333]">{run.selectorRate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onNavigate('run-detail', run.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#e9e9e8] bg-white px-2.5 py-1 text-xs text-[#37352f] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
                      >
                        <span>View Log</span>
                        <ChevronRight className="h-3 w-3 text-[#787774]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

