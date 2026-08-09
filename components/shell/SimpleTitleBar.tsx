/** Centered page title bar for Favorites and Settings (D-35/D-45). */
export function SimpleTitleBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-outline-variant bg-surface">
      <div className="mx-auto max-w-container-max px-gutter py-space-md text-center">
        <h1 className="text-h3 font-semibold text-on-surface">{title}</h1>
      </div>
    </header>
  );
}
