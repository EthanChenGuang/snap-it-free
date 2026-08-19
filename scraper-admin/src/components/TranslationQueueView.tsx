import React, { useState } from 'react';
import {
  Languages,
  AlertTriangle,
  RefreshCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { TranslationItem, SystemConfig } from '../types';

interface TranslationQueueViewProps {
  items: TranslationItem[];
  systemConfig: SystemConfig;
  onToggleAutoTranslate: () => void;
  onTranslateItem: (id: string) => Promise<void>;
  onTranslateAll: () => Promise<void>;
}

export const TranslationQueueView: React.FC<TranslationQueueViewProps> = ({
  items,
  systemConfig,
  onToggleAutoTranslate,
  onTranslateItem,
  onTranslateAll,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSingleRetry = async (id: string) => {
    setLoadingId(id);
    try {
      await onTranslateItem(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRetryAll = async () => {
    setIsTranslatingAll(true);
    try {
      await onTranslateAll();
    } finally {
      setIsTranslatingAll(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 font-sans text-[#37352f]">
      {/* Notion Page Icon & Header */}
      <div className="space-y-2 border-b border-[#e9e9e8] pb-6">
        <div className="text-4xl select-none leading-none">🔠</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
              Translation Queue
            </h1>
            <p className="text-xs text-[#787774] mt-1.5 leading-relaxed">
              Automated natural language translation queue powered by Gemini 3.6 Flash Server API.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto Translate Toggle */}
            <div className="flex items-center gap-2 rounded-md border border-[#e9e9e8] bg-[#f7f6f3] px-3 py-1.5 text-xs text-[#37352f]">
              <Sparkles className="h-3.5 w-3.5 text-[#b06000]" />
              <span className="font-semibold">Gemini Auto-Translate:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemConfig.autoTranslate}
                  onChange={onToggleAutoTranslate}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-[#e3e2e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#37352f]"></div>
              </label>
            </div>

            <button
              onClick={handleRetryAll}
              disabled={items.length === 0 || isTranslatingAll}
              className="flex items-center gap-1.5 rounded-md bg-[#37352f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isTranslatingAll ? 'animate-spin' : ''}`} />
              <span>{isTranslatingAll ? 'Translating...' : 'Retry All Pending'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notion Status Callout Banner */}
      <div className="flex items-center justify-between bg-[#fdecc8] p-3.5 rounded-md border border-[#f9e2b1] text-xs text-[#402c1b]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#b06000] shrink-0" />
          <span className="font-semibold">
            {items.length} listings currently pending Gemini translation pass.
          </span>
        </div>

        <div className="text-xs font-mono font-medium">
          Selected: <span className="font-bold">{selectedIds.length}</span>
        </div>
      </div>

      {/* Database View Table */}
      <div className="rounded-md border border-[#e9e9e8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#37352f]">
            <thead className="bg-[#f7f6f3] text-[11px] font-semibold text-[#787774] uppercase tracking-wider border-b border-[#e9e9e8]">
              <tr>
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={toggleSelectAll}
                    className="accent-[#37352f]"
                  />
                </th>
                <th className="px-4 py-2.5">Listing ID</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Original Foreign Content</th>
                <th className="px-4 py-2.5">Pipeline Error Log</th>
                <th className="px-4 py-2.5">Retries</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e8]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#787774]">
                    <CheckCircle2 className="h-8 w-8 text-[#137333] mx-auto mb-2" />
                    Translation queue is clear. All incoming listings translated into English.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isLoading = loadingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#f7f6f3] transition-colors ${
                        isSelected ? 'bg-[#fdecc8]/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          className="accent-[#37352f]"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#37352f]">
                        {item.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#37352f]">
                        {item.source}
                      </td>
                      <td className="px-4 py-3 max-w-xs space-y-0.5">
                        <p className="font-bold text-xs text-[#37352f] truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[#787774] truncate">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`flex items-start gap-1.5 text-xs p-1.5 rounded border ${
                            item.errorType === 'warning'
                              ? 'bg-[#fdecc8] text-[#402c1b] border-[#f9e2b1]'
                              : 'bg-[#ffe2dd] text-[#5d1715] border-[#f5c6cb]'
                          }`}
                        >
                          <span className="font-mono text-[11px]">{item.errorMessage}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#787774]">
                        {item.retries} / 5
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSingleRetry(item.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 rounded bg-[#37352f] px-2.5 py-1 text-xs font-semibold text-white hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <RefreshCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>{isLoading ? 'Translating...' : 'Retry Gemini'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

