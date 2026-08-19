import React from 'react';
import { NavTab } from '../types';

interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onBack?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearchInput?: boolean;
  onToggleSearchInput?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onBack,
  showSearchInput,
  onToggleSearchInput,
}) => {
  const isDetail = currentTab === 'detail';

  return (
    <header className="w-full top-0 sticky z-40 bg-[#fbfbfa] border-b border-[#ececec]">
      <div className="flex justify-between items-center px-4 py-3 max-w-container-max mx-auto">
        <div className="flex items-center gap-2.5">
          {isDetail ? (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-[#efefed] transition-colors rounded text-[#37352f] cursor-pointer flex items-center justify-center"
              title="Back"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
          ) : (
            <button
              onClick={() => onTabChange('setting')}
              className="p-1.5 hover:bg-[#efefed] transition-colors rounded text-[#37352f] cursor-pointer flex items-center justify-center"
              title="Menu"
            >
              <span className="material-symbols-outlined text-lg">menu</span>
            </button>
          )}

          <div 
            onClick={() => onTabChange('list')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-6 h-6 bg-[#df6b05] rounded flex items-center justify-center text-white text-xs font-bold shadow-xs transition-transform group-hover:scale-105">
              手
            </div>
            <h1 className="text-base font-bold text-[#37352f] tracking-tight">
              手慢无
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDetail ? (
            <>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: '手慢无 Item', url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="p-1.5 hover:bg-[#efefed] transition-colors rounded text-[#91918e] hover:text-[#37352f] cursor-pointer flex items-center justify-center"
                title="Share"
              >
                <span className="material-symbols-outlined text-lg">share</span>
              </button>
              <button
                className="p-1.5 hover:bg-[#efefed] transition-colors rounded text-[#91918e] hover:text-[#37352f] cursor-pointer flex items-center justify-center"
                title="More"
              >
                <span className="material-symbols-outlined text-lg">more_horiz</span>
              </button>
            </>
          ) : (
            <button
              onClick={onToggleSearchInput}
              className={`p-1.5 hover:bg-[#efefed] transition-colors rounded text-[#91918e] hover:text-[#37352f] cursor-pointer flex items-center justify-center ${
                showSearchInput ? 'bg-[#efefed] text-[#37352f]' : ''
              }`}
              title="Search"
            >
              <span className="material-symbols-outlined text-lg">search</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
