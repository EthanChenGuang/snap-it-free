import { cn } from '@/lib/utils';

type FreeBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

/** Solid white FREE capsule for listing photo overlays (reference: Snag feed fig. 2). */
export function FreeBadge({ children, className }: FreeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center justify-center rounded-full',
        'border border-black/5 bg-white px-3.5 py-1 shadow-sm',
        'text-label-md font-bold tracking-wide text-emerald-600 uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}
