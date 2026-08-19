import React from 'react';
import { NavTab, AppSettings } from '../types';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  settings?: AppSettings;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, settings }) => {
  const lang = settings?.language || 'zh';

  const labels = {
    map: lang === 'zh' ? '地图' : lang === 'it' ? 'Mappa' : 'Map',
    list: lang === 'zh' ? '列表' : lang === 'it' ? 'Elenco' : 'List',
    post: lang === 'zh' ? '发布' : lang === 'it' ? 'Pubblica' : 'Post',
    setting: lang === 'zh' ? '设置' : lang === 'it' ? 'Impostazioni' : 'Setting',
  };

  const navItems: { tab: NavTab; icon: string; label: string }[] = [
    { tab: 'map', icon: 'map', label: labels.map },
    { tab: 'list', icon: 'format_list_bulleted', label: labels.list },
    { tab: 'post', icon: 'add_box', label: labels.post },
    { tab: 'setting', icon: 'settings', label: labels.setting },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-[#fbfbfa] border-t border-[#ececec] px-4 py-2 shadow-xs">
      {navItems.map((item) => {
        const isActive = currentTab === item.tab || (currentTab === 'detail' && item.tab === 'list');
        return (
          <button
            key={item.tab}
            onClick={() => onTabChange(item.tab)}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer active:scale-95 ${
              isActive
                ? 'text-[#37352f] font-semibold bg-[#efefed]'
                : 'text-[#91918e] hover:text-[#37352f] hover:bg-[#efefed]/60'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{
                fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
