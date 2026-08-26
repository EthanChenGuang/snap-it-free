import { cn } from '@/lib/utils';

type FreeBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

/** iOS-style frosted FREE pill for listing photo overlays. */
export function FreeBadge({ children, className }: FreeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15',
        'px-2.5 py-0.5 text-label-sm font-semibold uppercase tracking-widest',
        'text-emerald-700 backdrop-blur-md dark:text-emerald-300',
        className,
      )}
    >
      {children}
    </span>
  );
}
