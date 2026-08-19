import React, { useState } from 'react';
import { Item } from '../types';

interface ItemDetailViewProps {
  item: Item;
  allItems: Item[];
  onSelectItem: (item: Item) => void;
  onClaimItem: (itemId: string) => void;
  onOpenMessageOwner: (ownerName: string, itemId: string) => void;
}

export const ItemDetailView: React.FC<ItemDetailViewProps> = ({
  item,
  allItems,
  onSelectItem,
  onClaimItem,
  onOpenMessageOwner,
}) => {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = () => {
    if (!item.isAvailable) return;
    setClaiming(true);
    setTimeout(() => {
      onClaimItem(item.id);
      setClaiming(false);
    }, 600);
  };

  const similarItems = allItems.filter((i) => i.id !== item.id).slice(0, 3);

  return (
    <main className="max-w-container-max mx-auto px-4 py-6 pb-32">
      {/* Workspace Breadcrumbs */}
      <div className="mb-6 flex items-center space-x-2 text-xs text-[#91918e] border-b border-[#ececec] pb-3">
        <span className="hover:text-[#37352f] cursor-pointer">Items</span>
        <span>/</span>
        <span className="hover:text-[#37352f] cursor-pointer">{item.category}</span>
        <span>/</span>
        <span className="font-semibold text-[#37352f] truncate max-w-[200px]">{item.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media & Primary Details */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Primary Image Container */}
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-md border border-[#ececec] bg-[#fbfbfa] group">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
              <span className="bg-[#df6b05] text-white px-2.5 py-1 text-[11px] font-bold rounded uppercase tracking-wider shadow-xs">
                {item.badge || 'Verified Free'}
              </span>
              <span className="bg-white/90 backdrop-blur-xs text-[#37352f] border border-[#ececec] px-2.5 py-1 text-[11px] font-medium rounded">
                {item.timeAgo}
              </span>
            </div>
          </div>

          {/* Title Section */}
          <div className="border-b border-[#ececec] pb-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[#37352f] tracking-tight">
              {item.title}
            </h2>
            <p className="text-sm text-[#91918e] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {item.location}
            </p>
          </div>

          {/* Document Style Content */}
          <article className="prose prose-neutral max-w-none flex flex-col gap-6">
            <section>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#91918e] mb-2">Description</h4>
              <p className="text-sm text-[#37352f] leading-relaxed">
                {item.description}
              </p>
            </section>

            {/* Condition Checklist */}
            {item.conditionDetails && item.conditionDetails.length > 0 && (
              <section className="bg-white p-4 rounded-md border border-[#ececec]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#91918e] mb-3">
                  Item Condition & Specs
                </h4>
                <ul className="space-y-2">
                  {item.conditionDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#37352f]">
                      <span
                        className="material-symbols-outlined text-[#df6b05] shrink-0 mt-0.5 text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {idx === 2 ? 'info' : 'check_circle'}
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Logistics */}
            {item.pickupLogistics && (
              <section className="bg-[#fbfbfa] p-4 rounded-md border border-[#ececec]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#91918e] mb-2">Pick-up Logistics</h4>
                <p className="text-sm text-[#37352f] leading-relaxed">
                  {item.pickupLogistics}
                </p>
              </section>
            )}
          </article>
        </div>

        {/* Right Column: Sidebar / Action Cards */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* Main Action Card */}
          <div className="bg-white border border-[#ececec] rounded-md p-5 sticky top-20 shadow-2xs">
            <div className="flex justify-between items-center mb-5 border-b border-[#ececec] pb-4">
              <div>
                <span className="text-[10px] text-[#91918e] uppercase tracking-wider block mb-0.5 font-semibold">Status</span>
                {item.isAvailable ? (
                  <span className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                    Available Now
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[#91918e] bg-[#efefed] px-2 py-0.5 rounded text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#91918e]"></span>
                    Claimed
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#91918e] uppercase tracking-wider block mb-0.5 font-semibold">Price</span>
                <span className="text-lg text-[#df6b05] font-bold bg-[#fff5eb] px-2 py-0.5 rounded border border-[#fde3cf]">{item.cost}</span>
              </div>
            </div>

            {item.isAvailable ? (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-[#37352f] text-white py-2.5 rounded text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm">bolt</span>
                {claiming ? 'Claiming...' : 'Claim This Item'}
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-[#efefed] text-[#91918e] py-2.5 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Item Claimed
              </button>
            )}

            <button
              onClick={() => onOpenMessageOwner(item.owner.name, item.id)}
              className="w-full mt-2.5 bg-white border border-[#ececec] text-[#37352f] py-2.5 rounded text-xs font-semibold hover:bg-[#efefed] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chat_bubble</span>
              Message Owner
            </button>

            {/* Owner Details */}
            <div className="mt-5 pt-4 border-t border-[#ececec]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#efefed] flex items-center justify-center overflow-hidden shrink-0 border border-[#ececec]">
                  <img
                    src={item.owner.avatar}
                    alt={item.owner.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs text-[#37352f] font-bold">{item.owner.name}</p>
                  <p className="text-[11px] text-[#91918e]">
                    Member since {item.owner.joinedYear} • {item.owner.itemsGiven} Items
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Block: Source & Location */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white border border-[#ececec] rounded-md p-3.5 flex items-center gap-3">
              <div className="p-2 bg-[#fbfbfa] rounded border border-[#ececec] text-[#df6b05] shrink-0">
                <span className="material-symbols-outlined text-base">verified</span>
              </div>
              <div>
                <p className="text-[10px] text-[#91918e] uppercase tracking-wider font-semibold">Source Identity</p>
                <p className="text-xs text-[#37352f] font-semibold">Verified Community Member</p>
              </div>
            </div>

            <div className="bg-white border border-[#ececec] rounded-md overflow-hidden">
              <div className="p-3.5 flex items-center gap-3">
                <div className="p-2 bg-[#fbfbfa] rounded border border-[#ececec] text-[#37352f] shrink-0">
                  <span className="material-symbols-outlined text-base">map</span>
                </div>
                <div>
                  <p className="text-[10px] text-[#91918e] uppercase tracking-wider font-semibold">Location</p>
                  <p className="text-xs text-[#37352f] font-semibold">
                    {item.location} {item.distanceKm ? `• ${item.distanceKm}km away` : ''}
                  </p>
                </div>
              </div>
              <div className="w-full h-28 bg-[#fbfbfa] relative border-t border-[#ececec]">
                <img
                  src={
                    item.mapSnippetUrl ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuCU8BB8aMW4s8iftRQOGGiFAQtGfvj_PlbjBF85RSXx6S2jD8nmwi81Y9ZaO-QFZo-V90DULoigmvYq_w0XDM18MTdmJOK8RIdEoKDF4MsFodCHPXnlFVZfx1OGeSsnxC7OcYSIfrksK88VZwE7Ch9wwFOCw9XfC7srIjkLcMIlqUHOnlf2YXJphhseeQJXaukKMOa-Le77q4UL8seip7EdU6ZcSbylG1jrt92Tyl9Q8lS2Aj-Lzf-Wvg'
                  }
                  alt="Location map snippet"
                  className="w-full h-full object-cover opacity-80 grayscale"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 bg-[#df6b05] rounded-full ring-4 ring-white shadow-md animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Related Items / Suggested */}
          <div>
            <h5 className="text-[10px] text-[#91918e] uppercase tracking-wider font-bold mb-3">
              Similar Near You
            </h5>
            <div className="flex flex-col gap-2">
              {similarItems.map((sim) => (
                <div
                  key={sim.id}
                  onClick={() => onSelectItem(sim)}
                  className="group flex gap-3 items-center p-2 bg-white border border-[#ececec] hover:border-[#37352f] transition-all rounded-md cursor-pointer"
                >
                  <div className="w-12 h-12 rounded bg-[#fbfbfa] overflow-hidden shrink-0 border border-[#f1f1ef]">
                    <img src={sim.imageUrl} alt={sim.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs text-[#37352f] font-semibold group-hover:underline">
                      {sim.title}
                    </p>
                    <p className="text-[11px] text-[#91918e]">
                      {sim.distanceKm ? `${sim.distanceKm}km • ` : ''}
                      {sim.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
