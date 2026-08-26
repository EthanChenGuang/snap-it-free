import { cn } from '@/lib/utils';

type FreeBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

/** Clean white FREE capsule for listing photo overlays (reference: Snag-style feed). */
export function FreeBadge({ children, className }: FreeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/40 bg-white/95',
        'px-2.5 py-0.5 text-label-sm font-bold uppercase tracking-wider text-emerald-600 shadow-sm',
        className,
      )}
    >
      {children}
    </span>
  );
}
