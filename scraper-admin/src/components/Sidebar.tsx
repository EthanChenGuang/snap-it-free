import React from 'react';
import {
  LayoutDashboard,
  Layers,
  History,
  AlertOctagon,
  Languages,
  Sliders,
  ChevronDown,
  Search,
  Plus,
  Zap,
  Check,
  Sparkles,
  Database,
  ExternalLink,
} from 'lucide-react';
import { NavTab } from '../types';

interface SidebarProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  pendingTranslationsCount: number;
  rejectsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  pendingTranslationsCount,
  rejectsCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard Overview',
      icon: '📊',
      lucideIcon: LayoutDashboard,
    },
    {
      id: 'sources' as NavTab,
      label: 'Integration Sources',
      icon: '🌐',
      lucideIcon: Layers,
    },
    {
      id: 'runs' as NavTab,
      label: 'Execution History',
      icon: '📜',
      lucideIcon: History,
    },
    {
      id: 'rejects' as NavTab,
      label: 'Scrape Rejects',
      icon: '🚫',
      lucideIcon: AlertOctagon,
      badge: rejectsCount > 0 ? rejectsCount : undefined,
      badgeColor: 'bg-[#ffe2dd] text-[#5d1715]',
    },
    {
      id: 'translation' as NavTab,
      label: 'Translation Queue',
      icon: '🔠',
      lucideIcon: Languages,
      badge: pendingTranslationsCount > 0 ? pendingTranslationsCount : undefined,
      badgeColor: 'bg-[#fdecc8] text-[#402c1b]',
    },
    {
      id: 'settings' as NavTab,
      label: 'System Parameters',
      icon: '⚙️',
      lucideIcon: Sliders,
    },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-[#e9e9e8] bg-[#fbfbfa] flex flex-col justify-between h-[calc(100vh-3.5rem)] sticky top-14 select-none font-sans">
      <div className="p-2 space-y-3">
        {/* Notion Workspace Picker Header */}
        <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-[#efefed] transition-colors cursor-pointer group">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#37352f] text-white font-semibold text-xs shadow-xs">
              ⚡
            </div>
            <div className="truncate">
              <h1 className="text-xs font-semibold text-[#37352f] truncate flex items-center gap-1">
                Scraper Admin
                <ChevronDown className="h-3 w-3 text-[#787774] shrink-0" />
              </h1>
              <p className="text-[10px] text-[#787774] font-mono truncate">Subito & Workers v2.4</p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-[#137333] bg-[#e6f4ea] px-1.5 py-0.5 rounded border border-[#ceead6]">
            Live
          </span>
        </div>

        {/* Quick Search Button (Notion Cmd+K) */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-[#787774] rounded-md border border-[#e9e9e8] bg-white hover:bg-[#f7f6f3] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-[#9b9a97]" />
            <span>Search workspace...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-[#f1f1ef] px-1.5 py-0.5 rounded text-[#787774] border border-[#e2e2e1]">
            ⌘K
          </kbd>
        </button>

        {/* Navigation Sections */}
        <div className="space-y-0.5 pt-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9b9a97]">
            Workspace Pages
          </div>
          {navItems.map((item) => {
            const isActive =
              currentTab === item.id ||
              (currentTab === 'source-detail' && item.id === 'sources') ||
              (currentTab === 'run-detail' && item.id === 'runs');

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#efefed] font-semibold text-[#37352f]'
                    : 'text-[#5a5a58] hover:bg-[#f1f1ef] hover:text-[#37352f]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Links Section */}
        <div className="space-y-0.5 pt-2 border-t border-[#e9e9e8]">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9b9a97]">
            Active Target
          </div>
          <button
            onClick={() => onNavigate('source-detail', 'subito')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              currentTab === 'source-detail'
                ? 'bg-[#efefed] font-semibold text-[#37352f]'
                : 'text-[#5a5a58] hover:bg-[#f1f1ef] hover:text-[#37352f]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs">⚡</span>
              <span className="truncate">Subito.it Crawler</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </button>
        </div>
      </div>

      {/* Notion Footer Status Widget */}
      <div className="p-3 border-t border-[#e9e9e8] bg-[#f7f6f3] space-y-2 text-xs">
        <div className="flex items-center justify-between text-[#787774]">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Database className="h-3.5 w-3.5 text-[#9b9a97]" />
            DB Pool: 4/10
          </span>
          <span className="text-[#137333] font-semibold text-[11px] bg-[#e6f4ea] px-1.5 py-0.2 rounded">
            Healthy
          </span>
        </div>
        <div className="p-2 rounded border border-[#e9e9e8] bg-white text-[11px] text-[#787774] space-y-1 font-mono">
          <div className="flex justify-between">
            <span>Last Sync:</span>
            <span className="text-[#37352f] font-semibold">12m ago</span>
          </div>
          <div className="flex justify-between">
            <span>Hit Rate:</span>
            <span className="text-[#137333] font-bold">98.4%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

