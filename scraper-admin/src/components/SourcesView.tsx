import React, { useState } from 'react';
import {
  Plus,
  Play,
  Settings,
  Search,
  Check,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  X,
  Filter,
} from 'lucide-react';
import { Source, NavTab } from '../types';

interface SourcesViewProps {
  sources: Source[];
  onNavigate: (tab: NavTab, sourceId?: string) => void;
  onToggleSource: (sourceId: string) => void;
  onRunNow: (sourceId: string) => void;
  onAddSource: (newSource: Source) => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({
  sources,
  onNavigate,
  onToggleSource,
  onRunNow,
  onAddSource,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceInterval, setNewSourceInterval] = useState(60);

  const filteredSources = sources.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    const created: Source = {
      id: newSourceName.toLowerCase().replace(/\s+/g, '-'),
      name: newSourceName,
      status: 'Idle',
      enabled: true,
      interval: Number(newSourceInterval),
      antiBlock: 'Standard',
      targetUrls: newSourceUrl ? [newSourceUrl] : ['https://example.com/listings'],
      lastRun: 'Just added',
      isSupported: true,
    };

    onAddSource(created);
    setIsAddModalOpen(false);
    setNewSourceName('');
    setNewSourceUrl('');
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Notion Page Icon & Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">🌐</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
              Integration Sources
            </h1>
            <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
              Target marketplace crawler drivers, schedule frequencies, and anti-blocking strategies.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Source
          </button>
        </div>
      </div>

      {/* Notion Database Table View Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f7f6f3] p-2.5 rounded-md border border-[#e9e9e8]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9b9a97]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sources database..."
            className="w-full rounded-md border border-[#e9e9e8] bg-white py-1 pl-8 pr-3 text-xs text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#37352f] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#787774] font-mono">
          <span className="bg-[#e3e2e0] text-[#32302c] px-2 py-0.5 rounded font-semibold text-[11px]">
            {filteredSources.length} records
          </span>
        </div>
      </div>

      {/* Database Table */}
      <div className="rounded-md border border-[#e9e9e8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#37352f]">
            <thead className="bg-[#f7f6f3] text-[11px] font-semibold text-[#787774] uppercase tracking-wider border-b border-[#e9e9e8]">
              <tr>
                <th className="px-4 py-2.5">Source Platform</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Enabled</th>
                <th className="px-4 py-2.5">Frequency</th>
                <th className="px-4 py-2.5">Anti-Block Strategy</th>
                <th className="px-4 py-2.5">Last Run</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e8]">
              {filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-[#f7f6f3] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#37352f]">
                    <div className="flex items-center gap-2">
                      {source.logoUrl ? (
                        <img
                          src={source.logoUrl}
                          alt={source.name}
                          className="h-5 w-5 object-contain rounded border border-[#e9e9e8] bg-white"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs">🌐</span>
                      )}
                      <span>{source.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {source.status === 'Running' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#e6f4ea] px-1.5 py-0.2 text-[10px] font-semibold text-[#137333]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Running
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
                  </td>
                  <td className="px-4 py-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        disabled={!source.isSupported}
                        onChange={() => onToggleSource(source.id)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-[#e3e2e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#37352f] peer-disabled:opacity-40"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#787774]">
                    Every {source.interval}m
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-[#d3e5ef] text-[#183347]">
                      <Shield className="h-3 w-3 opacity-80" />
                      {source.antiBlock}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#787774]">
                    {source.lastRun || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {source.isSupported && (
                        <button
                          onClick={() => onRunNow(source.id)}
                          className="flex items-center gap-1 rounded bg-[#37352f] px-2 py-1 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Run
                        </button>
                      )}
                      <button
                        onClick={() => onNavigate('source-detail', source.id)}
                        className="flex items-center gap-1 rounded border border-[#e9e9e8] bg-white px-2 py-1 text-xs text-[#37352f] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
                      >
                        <Settings className="h-3 w-3 text-[#787774]" />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notion Add Source Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-[#e9e9e8] bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">➕</span>
                <h3 className="text-sm font-bold text-[#37352f]">Add Custom Integration Source</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#787774] hover:text-[#37352f] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Source Platform Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Immobiliare.it, Idealista, Kijiji"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full rounded-md border border-[#e9e9e8] p-2 text-xs focus:border-[#37352f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Primary Target Scrape URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.example.com/listings"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="w-full rounded-md border border-[#e9e9e8] p-2 text-xs focus:border-[#37352f] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Default Schedule Interval (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={newSourceInterval}
                  onChange={(e) => setNewSourceInterval(Number(e.target.value))}
                  className="w-full rounded-md border border-[#e9e9e8] p-2 text-xs focus:border-[#37352f] focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e9e9e8]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-md border border-[#e9e9e8] px-3 py-1.5 text-xs text-[#787774] hover:bg-[#f7f6f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black cursor-pointer"
                >
                  Create Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

