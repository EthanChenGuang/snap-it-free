import React from 'react';
import { ShieldCheck, Search, Bell, HelpCircle, Star, Share2, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { NavTab, SystemConfig } from '../types';

interface HeaderProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  systemConfig: SystemConfig;
  onToggleGlobalPause: () => void;
  pendingTranslationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  systemConfig,
  onToggleGlobalPause,
  pendingTranslationsCount,
}) => {
  const tabTitles: Record<NavTab, { title: string; icon: string }> = {
    dashboard: { title: 'Dashboard Overview', icon: '📊' },
    sources: { title: 'Integration Sources', icon: '🌐' },
    'source-detail': { title: 'Subito Crawler Config', icon: '⚡' },
    runs: { title: 'Execution History', icon: '📜' },
    'run-detail': { title: 'Execution Detail', icon: '🔍' },
    rejects: { title: 'Scrape Rejects', icon: '🚫' },
    translation: { title: 'Translation Queue', icon: '🔠' },
    settings: { title: 'System Parameters', icon: '⚙️' },
  };

  const currentInfo = tabTitles[currentTab] || { title: 'Workspace', icon: '📄' };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#e9e9e8] bg-white/90 px-4 md:px-6 backdrop-blur-md select-none font-sans">
      <div className="flex items-center gap-2">
        {/* Notion-style Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[#787774]">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1 font-semibold text-[#37352f] hover:bg-[#efefed] px-1.5 py-1 rounded transition-colors cursor-pointer"
          >
            <span>⚡ Workspace</span>
          </button>
          <span>/</span>
          <div className="flex items-center gap-1.5 font-medium text-[#37352f] px-1.5 py-1 rounded">
            <span>{currentInfo.icon}</span>
            <span className="font-semibold">{currentInfo.title}</span>
          </div>
        </div>

        {/* Engine Status Pill */}
        <div className="hidden lg:flex items-center gap-2 ml-3 pl-3 border-l border-[#e9e9e8] text-xs">
          {systemConfig.globalPause ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#5d1715] bg-[#ffe2dd] px-2 py-0.5 rounded border border-[#f5c6cb]">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
              ENGINE PAUSED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded border border-[#ceead6]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              ENGINE RUNNING
            </span>
          )}
          <button
            onClick={onToggleGlobalPause}
            className="text-[11px] font-medium text-[#787774] hover:text-[#37352f] hover:underline cursor-pointer"
          >
            {systemConfig.globalPause ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Center Notion Search bar */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9b9a97]" />
          <input
            type="text"
            placeholder="Search listings, errors, or configs..."
            className="w-full rounded-md border border-[#e9e9e8] bg-[#f7f6f3] py-1 pl-8 pr-3 text-xs text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#37352f] focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right Notion Actions */}
      <div className="flex items-center gap-1.5">
        {pendingTranslationsCount > 0 && (
          <button
            onClick={() => onNavigate('translation')}
            className="flex items-center gap-1 rounded bg-[#fdecc8] px-2.5 py-1 text-xs font-semibold text-[#402c1b] hover:bg-[#f9e2b1] transition-colors cursor-pointer mr-1"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#b06000]" />
            <span className="hidden sm:inline">Translation Queue:</span>
            <span>{pendingTranslationsCount}</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-1 text-xs text-[#5a5a58] hover:bg-[#efefed] hover:text-[#37352f] px-2 py-1 rounded transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-[#787774]" />
            <span>Share</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="p-1 text-[#787774] hover:bg-[#efefed] hover:text-[#37352f] rounded transition-colors cursor-pointer"
            title="Star Favorite"
          >
            <Star className="h-4 w-4" />
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="p-1 text-[#787774] hover:bg-[#efefed] hover:text-[#37352f] rounded transition-colors cursor-pointer"
            title="Updates & Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-[#e9e9e8] mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <span className="hidden xl:inline text-[11px] font-mono text-[#787774]">
            operator@system.local
          </span>
          <div className="h-6 w-6 rounded-full bg-[#e3e2e0] text-[#32302c] font-bold text-[11px] flex items-center justify-center border border-[#d3d2d0]">
            OP
          </div>
        </div>
      </div>
    </header>
  );
};

