import '@/app/listing-detail.css';

/** Shared listing detail loading placeholder (route loading + auth resolve). */
export function ListingDetailSkeleton() {
  return (
    <div className="listing-detail flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        <div className="aspect-square w-full animate-pulse bg-surface-container-low md:aspect-[4/3]" />
        <div className="px-gutter pt-space-lg">
          <div className="space-y-space-sm border-b border-outline-variant pb-space-md">
            <div className="h-8 w-3/4 max-w-md animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-1/3 max-w-xs animate-pulse rounded bg-surface-container-high" />
          </div>
          <div className="space-y-space-sm py-space-lg">
            <div className="h-4 w-full animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
          </div>
          <div className="space-y-space-xs border-b border-outline-variant py-space-md">
            <div className="h-6 w-16 animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
    </div>
  );
}
