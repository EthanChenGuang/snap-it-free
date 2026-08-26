import { cn } from '@/lib/utils';

type FreeBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

/** iOS high-transparency white glass pill for listing photo overlays. */
export function FreeBadge({ children, className }: FreeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/40 bg-white/75',
        'px-2.5 py-0.5 text-label-sm font-medium text-zinc-800 shadow-xs backdrop-blur-md',
        'dark:border-white/10 dark:bg-zinc-900/75 dark:text-zinc-100',
        className,
      )}
    >
      {children}
    </span>
  );
}
