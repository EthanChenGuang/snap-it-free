export default function ListingDetailLoading() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max">
        <div className="aspect-[4/3] w-full animate-pulse bg-surface-container-low md:aspect-[16/10]" />
        <div className="relative -mt-5 rounded-t-2xl border border-outline-variant bg-surface-container-lowest px-gutter pb-28 pt-space-lg">
          <div className="mx-auto max-w-lg space-y-3 text-center">
            <div className="mx-auto h-8 w-3/4 animate-pulse rounded bg-surface-container-high" />
            <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-surface-container-high" />
          </div>
          <div className="mx-auto my-space-lg max-w-lg border-t border-outline-variant" />
          <div className="mx-auto max-w-lg space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-container-high" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
          </div>
        </div>
      </div>
    </div>
  );
}
