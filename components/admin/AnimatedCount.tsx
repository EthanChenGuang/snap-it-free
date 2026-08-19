import { cn } from '@/lib/utils';

type AnimatedCountProps = {
  value: number;
  className?: string;
};

/** Tabular mono count with subtle transition for live polling updates. */
export function AnimatedCount({ value, className }: AnimatedCountProps) {
  return (
    <span
      className={cn('font-mono tabular-nums transition-all duration-300', className)}
    >
      {value}
    </span>
  );
}
