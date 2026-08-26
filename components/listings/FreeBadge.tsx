import { cardOverlayGlassClass } from '@/components/listings/cardOverlayGlass';
import { cn } from '@/lib/utils';

type FreeBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

/** iOS white frosted FREE pill with emerald accent dot for listing photo overlays. */
export function FreeBadge({ children, className }: FreeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1',
        cardOverlayGlassClass,
        'text-label-md font-semibold text-emerald-700 dark:text-emerald-400',
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      {children}
    </span>
  );
}
