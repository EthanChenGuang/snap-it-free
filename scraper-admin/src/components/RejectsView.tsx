import React, { useState } from 'react';
import {
  AlertOctagon,
  Filter,
  Download,
  Code2,
  Copy,
  Check,
  X,
  CheckCircle2,
  FileJson,
  ExternalLink,
} from 'lucide-react';
import { RejectPayload, NavTab } from '../types';

interface RejectsViewProps {
  rejects: RejectPayload[];
  onForceAccept: (rejectId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const RejectsView: React.FC<RejectsViewProps> = ({
  rejects,
  onForceAccept,
  onNavigate,
}) => {
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedReason, setSelectedReason] = useState('All');
  const [activeJsonPayload, setActiveJsonPayload] = useState<RejectPayload | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredRejects = rejects.filter((item) => {
    if (selectedSource !== 'All' && item.source.toLowerCase() !== selectedSource.toLowerCase()) {
      return false;
    }
    if (selectedReason !== 'All' && !item.reason.toLowerCase().includes(selectedReason.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCopyJson = () => {
    if (!activeJsonPayload) return;
    navigator.clipboard.writeText(JSON.stringify(activeJsonPayload.rawJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rejects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `scrape_rejects_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Notion Page Icon & Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">🚫</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
              Scrape Rejects
            </h1>
            <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
              Review scraped listings filtered out by location rules, price limits, duplicates, or missing attributes.
            </p>
          </div>

          <button
            onClick={handleDownloadExport}
            className="flex items-center justify-center gap-1.5 rounded-md border border-[#e9e9e8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#37352f] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#787774]" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Notion Database Filter Bar */}
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
            <option value="Facebook">Facebook</option>
            <option value="Immobiliare">Immobiliare</option>
          </select>

          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="rounded-md border border-[#e9e9e8] bg-white px-2.5 py-1 text-xs text-[#37352f] focus:border-[#37352f] focus:outline-none cursor-pointer"
          >
            <option value="All">All Rejection Reasons</option>
            <option value="Location">Location Mismatch</option>
            <option value="Missing Price">Missing Price</option>
            <option value="Duplicate">Duplicate</option>
            <option value="Price Outlier">Price Outlier</option>
            <option value="Keyword">Keyword Filter</option>
          </select>
        </div>

        <div className="text-xs text-[#787774] font-mono">
          <span className="bg-[#e3e2e0] text-[#32302c] px-2 py-0.5 rounded font-semibold text-[11px]">
            {filteredRejects.length} rejects
          </span>
        </div>
      </div>

      {/* Database Table */}
      <div className="rounded-md border border-[#e9e9e8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#37352f]">
            <thead className="bg-[#f7f6f3] text-[11px] font-semibold text-[#787774] uppercase tracking-wider border-b border-[#e9e9e8]">
              <tr>
                <th className="px-4 py-2.5">Scraped At</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Listing ID</th>
                <th className="px-4 py-2.5">Rejection Reason</th>
                <th className="px-4 py-2.5">Payload Preview</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e8]">
              {filteredRejects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#787774]">
                    No rejected payloads match current filter settings.
                  </td>
                </tr>
              ) : (
                filteredRejects.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f7f6f3] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#787774]">
                      {item.foundAt}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#37352f]">
                      {item.source}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#37352f]">
                      {item.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded bg-[#ffe2dd] px-2 py-0.5 text-[10px] font-semibold text-[#5d1715] border border-[#f5c6cb]">
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#787774] max-w-xs truncate text-xs">
                      {item.preview}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setActiveJsonPayload(item)}
                        className="inline-flex items-center gap-1 rounded bg-[#37352f] px-2.5 py-1 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
                      >
                        <Code2 className="h-3 w-3" />
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw JSON Side Drawer Modal */}
      {activeJsonPayload && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#e9e9e8]">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#e9e9e8] flex items-center justify-between bg-[#f7f6f3]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📄</span>
                  <h3 className="text-sm font-bold text-[#37352f]">
                    Raw Payload: #{activeJsonPayload.id}
                  </h3>
                </div>
                <p className="text-[11px] text-[#787774] font-mono mt-0.5">
                  Source: {activeJsonPayload.source} · Scraped at {activeJsonPayload.foundAt}
                </p>
              </div>

              <button
                onClick={() => setActiveJsonPayload(null)}
                className="rounded p-1 text-[#787774] hover:bg-[#e3e2e0] hover:text-[#37352f] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Rejection Rule Banner */}
              <div className="rounded-md border border-[#f5c6cb] bg-[#ffe2dd] p-3 space-y-0.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5d1715]">
                  Rejection Rule Triggered
                </span>
                <p className="font-mono font-bold text-[#5d1715]">
                  {activeJsonPayload.ruleTriggered}
                </p>
              </div>

              {/* JSON Payload Viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#37352f]">Scraper Output JSON</span>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#787774] hover:text-[#37352f] cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-[#137333]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy JSON
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-md border border-[#37352f] bg-[#202020] text-[#70c38a] font-mono text-xs overflow-x-auto leading-relaxed max-h-[55vh]">
                  {JSON.stringify(activeJsonPayload.rawJson, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#e9e9e8] bg-[#f7f6f3] flex items-center justify-between">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 rounded-md border border-[#e9e9e8] bg-white px-3 py-1.5 text-xs text-[#37352f] hover:bg-[#f7f6f3] cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy JSON</span>
              </button>

              <button
                onClick={() => {
                  onForceAccept(activeJsonPayload.id);
                  setActiveJsonPayload(null);
                }}
                className="flex items-center gap-1.5 rounded-md bg-[#137333] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Force Accept Listing</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

