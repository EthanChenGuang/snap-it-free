import React, { useState } from 'react';
import {
  ChevronLeft,
  Play,
  Save,
  Shield,
  Clock,
  Globe,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Source, AntiBlockStrategy, NavTab } from '../types';

interface SubitoConfigViewProps {
  source: Source;
  onSave: (updatedSource: Source) => void;
  onRunNow: (sourceId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const SubitoConfigView: React.FC<SubitoConfigViewProps> = ({
  source,
  onSave,
  onRunNow,
  onNavigate,
}) => {
  const [enabled, setEnabled] = useState(source.enabled);
  const [interval, setInterval] = useState(source.interval);
  const [targetUrlsText, setTargetUrlsText] = useState(source.targetUrls.join('\n'));
  const [antiBlock, setAntiBlock] = useState<AntiBlockStrategy>(source.antiBlock);

  const handleDecreaseInterval = () => {
    setInterval((prev) => Math.max(30, prev - 15));
  };

  const handleIncreaseInterval = () => {
    setInterval((prev) => Math.min(1440, prev + 15));
  };

  const handleSave = () => {
    const urlsArray = targetUrlsText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    const updated: Source = {
      ...source,
      enabled,
      interval,
      targetUrls: urlsArray,
      antiBlock,
    };

    onSave(updated);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-[#787774]">
        <button
          onClick={() => onNavigate('sources')}
          className="flex items-center gap-1 hover:text-[#37352f] transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Data Sources</span>
        </button>
        <span>/</span>
        <span className="font-medium text-[#37352f]">{source.name}</span>
      </div>

      {/* Notion Page Icon & Title */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">⚡</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
              {source.name} Configuration
            </h1>
            <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
              Scraping schedule parameters, proxy delays, and search URL targets.
            </p>
          </div>

          <button
            onClick={() => onRunNow(source.id)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Trigger Manual Run</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Form Card */}
      <div className="rounded-md border border-[#e9e9e8] bg-white p-5 space-y-5 text-xs">
        {/* Source Status Switch */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e9e9e8]">
          <div>
            <h3 className="font-bold text-[#37352f]">Worker Execution Status</h3>
            <p className="text-[#787774] mt-0.5">
              Enable or suspend background scraping cycles for this target source.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-[#e3e2e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#37352f]"></div>
          </label>
        </div>

        {/* Run Interval Stepper */}
        <div className="space-y-2 pb-4 border-b border-[#e9e9e8]">
          <label className="block font-bold text-[#37352f]">
            Polling Frequency (Minutes)
          </label>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center rounded-md border border-[#e9e9e8] bg-[#f7f6f3]">
              <button
                type="button"
                onClick={handleDecreaseInterval}
                className="px-3 py-1 text-sm font-bold text-[#37352f] hover:bg-[#e3e2e0] rounded-l-md cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min="30"
                max="1440"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-16 text-center py-1 font-mono text-xs text-[#37352f] bg-white border-x border-[#e9e9e8] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleIncreaseInterval}
                className="px-3 py-1 text-sm font-bold text-[#37352f] hover:bg-[#e3e2e0] rounded-r-md cursor-pointer"
              >
                +
              </button>
            </div>
            <span className="text-[#787774] font-mono">
              (Polls every {interval} mins)
            </span>
          </div>
        </div>

        {/* Target URLs Textarea */}
        <div className="space-y-2 pb-4 border-b border-[#e9e9e8]">
          <div className="flex items-center justify-between">
            <label className="block font-bold text-[#37352f]">
              Target Search Entrypoints
            </label>
            <span className="text-[#787774] font-mono text-[11px]">One URL per line</span>
          </div>
          <textarea
            rows={5}
            value={targetUrlsText}
            onChange={(e) => setTargetUrlsText(e.target.value)}
            className="w-full rounded-md border border-[#e9e9e8] p-3 font-mono text-xs text-[#37352f] focus:border-[#37352f] focus:outline-none leading-relaxed bg-[#f7f6f3]"
            placeholder="https://www.subito.it/annunci-veneto/..."
          />
        </div>

        {/* Anti-block Strategy Cards */}
        <div className="space-y-3 pb-4 border-b border-[#e9e9e8]">
          <label className="block font-bold text-[#37352f]">
            Anti-block Protection Level
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'Conservative' as AntiBlockStrategy,
                title: 'Conservative',
                desc: '30-60s delays, highest proxy stealth',
              },
              {
                id: 'Standard' as AntiBlockStrategy,
                title: 'Standard',
                desc: '15-30s delays, balanced throughput',
              },
              {
                id: 'Aggressive' as AntiBlockStrategy,
                title: 'Aggressive',
                desc: '0-5s delays, maximum velocity',
              },
            ].map((strat) => (
              <div
                key={strat.id}
                onClick={() => setAntiBlock(strat.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  antiBlock === strat.id
                    ? 'border-[#37352f] bg-[#f7f6f3] ring-1 ring-[#37352f]'
                    : 'border-[#e9e9e8] bg-white hover:bg-[#f7f6f3]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#37352f]">{strat.title}</span>
                  <input
                    type="radio"
                    name="antiBlock"
                    checked={antiBlock === strat.id}
                    onChange={() => setAntiBlock(strat.id)}
                    className="accent-[#37352f]"
                  />
                </div>
                <p className="text-[11px] text-[#787774] mt-1 leading-tight">
                  {strat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Thresholds */}
        <div className="space-y-2">
          <label className="block font-bold text-[#37352f]">
            Active Validation Guardrails
          </label>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded bg-[#f7f6f3] border border-[#e9e9e8] px-2.5 py-1 font-mono text-[11px] text-[#37352f]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#137333]" />
              Selector accuracy ≥90%
            </span>
            <span className="inline-flex items-center gap-1.5 rounded bg-[#f7f6f3] border border-[#e9e9e8] px-2.5 py-1 font-mono text-[11px] text-[#37352f]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#137333]" />
              Yield count ≥50% median
            </span>
            <span className="inline-flex items-center gap-1.5 rounded bg-[#f7f6f3] border border-[#e9e9e8] px-2.5 py-1 font-mono text-[11px] text-[#37352f]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#137333]" />
              Geographic match ≥50%
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="sticky bottom-4 rounded-md border border-[#e9e9e8] bg-white p-3.5 shadow-md flex items-center justify-between">
        <span className="text-xs text-[#787774]">
          Changes will apply to the next worker cycle.
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('sources')}
            className="rounded-md border border-[#e9e9e8] bg-white px-3.5 py-1.5 text-xs text-[#787774] hover:bg-[#f7f6f3] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};

