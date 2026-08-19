import React, { useState } from 'react';
import { Item, Category } from '../types';

interface ListViewProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  onClaimItem: (itemId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: Category;
  onCategoryChange: (cat: Category) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  items,
  onSelectItem,
  onClaimItem,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}) => {
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const categories: Category[] = ['All', 'Furniture', 'Tech', 'Apparel', 'Books', 'Home Decor'];

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleClaim = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setClaimingId(itemId);
    setTimeout(() => {
      onClaimItem(itemId);
      setClaimingId(null);
    }, 600);
  };

  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-4 pt-6 pb-32">
      {/* Workspace Breadcrumb Header */}
      <div className="mb-6 flex items-center justify-between border-b border-[#ececec] pb-3">
        <div className="flex items-center space-x-2 text-xs text-[#91918e]">
          <span className="hover:text-[#37352f] cursor-pointer">Community</span>
          <span>/</span>
          <span className="font-semibold text-[#37352f]">🚀 Live Item Drops</span>
        </div>
        <span className="text-xs text-[#91918e] font-medium px-2 py-0.5 rounded bg-[#efefed]">
          {filteredItems.length} Available
        </span>
      </div>

      {/* Search & Filter Section */}
      <section className="mb-6">
        <div className="relative w-full mb-4">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91918e] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items nearby (e.g. chair, audio, books)..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#ececec] rounded-md focus:border-[#37352f] focus:outline-none text-sm text-[#37352f] placeholder-[#91918e] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#91918e] hover:text-[#37352f] text-sm p-1 rounded"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 select-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#37352f] text-white shadow-xs'
                    : 'bg-white border border-[#ececec] text-[#37352f] hover:bg-[#efefed]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bento Listing Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-[#ececec] rounded-md p-8">
            <span className="material-symbols-outlined text-4xl text-[#91918e] mb-2">inventory_2</span>
            <p className="text-base font-bold text-[#37352f] mb-1">No items found</p>
            <p className="text-xs text-[#91918e]">
              Try adjusting your search query or selecting a different category.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isClaiming = claimingId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="bg-white border border-[#ececec] p-4 flex flex-col group cursor-pointer hover:border-[#37352f] transition-all rounded-md shadow-2xs hover:shadow-xs"
              >
                <div className="relative overflow-hidden aspect-video mb-3.5 rounded-sm bg-[#fbfbfa] border border-[#f1f1ef]">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {item.badge && (
                    <div className="absolute top-2 left-2 bg-[#df6b05] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs shadow-2xs">
                      {item.badge}
                    </div>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-white text-[#37352f] px-3 py-1 font-bold text-xs uppercase tracking-wider rounded">
                        Claimed
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <h3 className="text-sm font-semibold leading-snug text-[#37352f] group-hover:underline">
                      {item.title}
                    </h3>
                    <span className="text-xs font-bold text-[#df6b05] bg-[#fff5eb] px-1.5 py-0.5 rounded border border-[#fde3cf] shrink-0">
                      {item.cost}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[#91918e] text-xs mb-3">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="truncate">{item.location}</span>
                  </div>
                </div>

                {item.isAvailable ? (
                  <button
                    onClick={(e) => handleClaim(e, item.id)}
                    disabled={isClaiming}
                    className="w-full py-2 bg-[#37352f] text-white text-xs font-semibold hover:bg-black active:scale-98 transition-all cursor-pointer rounded-xs"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim Item'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 bg-[#efefed] text-[#91918e] text-xs font-medium cursor-not-allowed rounded-xs"
                  >
                    Claimed
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
};
