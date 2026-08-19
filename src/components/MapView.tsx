import React, { useState } from 'react';
import { Item } from '../types';

interface MapViewProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  items,
  onSelectItem,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const areas = ['All Areas', 'Centro Storico', 'Mestre', 'Lido', "Jing'an"];

  const filteredItems = items.filter((item) => {
    const matchesArea =
      selectedArea === 'All Areas' ||
      item.location.toLowerCase().includes(selectedArea.toLowerCase()) ||
      item.district.toLowerCase().includes(selectedArea.toLowerCase());
    const matchesQuery =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesQuery;
  });

  return (
    <main className="relative w-full h-[calc(100vh-64px-64px)] md:h-[calc(100vh-64px)] overflow-hidden bg-[#fbfbfa] select-none">
      {/* Map Background Canvas */}
      <div className="absolute inset-0 z-0 bg-[#f5f4f0] overflow-hidden">
        {/* Subtle Map Grid lines & Vector styling */}
        <svg className="w-full h-full opacity-30 absolute inset-0 pointer-events-none">
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Simulated Canals / Roads */}
          <path
            d="M -100 200 C 300 100, 600 500, 1200 300"
            fill="none"
            stroke="#91918e"
            strokeWidth="24"
            opacity="0.3"
          />
          <path
            d="M 200 -100 C 400 400, 800 200, 1000 900"
            fill="none"
            stroke="#ffffff"
            strokeWidth="10"
          />
        </svg>

        {/* High quality map image texture fallback */}
        <div
          className="w-full h-full grayscale-[0.25] opacity-80 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD7XcadfWTt6cFQHJHJg09BKSeKQthbCHOJXipAthJYNF1Zr2KZNAVfHazwDUepUSYzlvy4YWnm8XXipBPJJEnBjCuScJBlAP9JzIcfv-CR-eHDiohxMFi3g2SFRLYj5wjOclKtM1v1dLe4MZKvDOwpOb1GzH16oN8c695shvnBFuE4pgh78veNnkF31QVMjr3bN7e4kO5INn66mCMK7GyIFIqzvE5bI6mmjADZjkfTo0u6vQdPS90tUw')`,
          }}
        />
      </div>

      {/* Search & Filter Chips (Floating Notion Style) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white border border-[#ececec] shadow-xs rounded-md flex items-center px-3 py-2">
          <span className="material-symbols-outlined text-[#91918e] mr-2 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search areas or drops..."
            className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none placeholder-[#91918e] text-[#37352f] font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-[#91918e] hover:text-[#37352f] text-xs p-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {areas.map((area) => {
            const isActive = selectedArea === area;
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#37352f] text-white shadow-xs'
                    : 'bg-white border border-[#ececec] text-[#37352f] hover:bg-[#efefed]'
                }`}
              >
                {area}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Pins on Map Canvas */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {filteredItems.map((item, index) => {
          const topPercent = 25 + ((index * 13) % 55);
          const leftPercent = 20 + ((index * 17) % 65);
          const isHovered = hoveredItemId === item.id;

          return (
            <div
              key={item.id}
              style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              onClick={() => onSelectItem(item)}
              className="absolute z-20 cursor-pointer pointer-events-auto group -translate-x-1/2 -translate-y-1/2"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={`transition-all duration-300 bg-[#37352f] text-white text-[10px] px-2 py-0.5 rounded-xs mb-1 font-bold whitespace-nowrap shadow-xs border border-[#ececec] ${
                    isHovered ? 'opacity-100 -translate-y-1' : 'opacity-90'
                  }`}
                >
                  {item.badge || item.title.slice(0, 16)}
                </div>
                <div className="w-5 h-5 bg-[#df6b05] rounded-full border-2 border-white flex items-center justify-center shadow-xs group-hover:scale-125 transition-transform">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet Drawer ("New Arrivals") */}
      <div
        className={`fixed bottom-16 md:bottom-0 left-0 w-full md:w-80 md:left-auto md:right-0 md:h-[calc(100vh-64px)] z-40 transition-transform duration-300 bg-white border-t md:border-t-0 md:border-l border-[#ececec] shadow-lg md:shadow-none flex flex-col ${
          isDrawerExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-72px)] md:translate-y-0'
        }`}
      >
        {/* Handle for Mobile Drag/Toggle */}
        <div
          onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
          className="h-7 w-full flex items-center justify-center md:hidden cursor-pointer bg-white border-b border-[#ececec]"
        >
          <div className="h-1 w-10 bg-[#ececec] rounded-full"></div>
        </div>

        <div className="px-4 pt-3 pb-8 flex-1 overflow-y-auto no-scrollbar">
          <div
            onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
            className="flex justify-between items-center mb-4 cursor-pointer md:cursor-default"
          >
            <div>
              <h2 className="text-base font-bold text-[#37352f] tracking-tight">New Arrivals</h2>
              <p className="text-[11px] text-[#91918e]">{filteredItems.length} items in this area</p>
            </div>
            <span className="material-symbols-outlined text-[#91918e] md:hidden">
              {isDrawerExpanded ? 'expand_more' : 'expand_less'}
            </span>
          </div>

          {/* Product Cards List in Drawer */}
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="group cursor-pointer bg-white p-2.5 rounded-md border border-[#ececec] hover:border-[#37352f] transition-all"
              >
                <div className="aspect-square bg-[#fbfbfa] rounded overflow-hidden border border-[#f1f1ef] mb-2">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-[10px] text-[#91918e] uppercase font-semibold">
                      {item.district}
                    </p>
                    <h3 className="text-xs font-semibold text-[#37352f] group-hover:underline">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-[#df6b05] bg-[#fff5eb] px-1 py-0.5 rounded border border-[#fde3cf] shrink-0">{item.cost}</p>
                </div>
                <p className="text-[11px] text-[#91918e] mt-1 line-clamp-1">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
