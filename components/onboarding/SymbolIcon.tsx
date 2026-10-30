import { cn } from '@/lib/utils';

export function SymbolIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      aria-hidden
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
    >
      {name}
    </span>
  );
}

/** Text-free arrow for CTAs (a ligature icon would leak "arrow_forward" into the button's text). */
export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} aria-hidden>
      <path
        d="M4 12h15m-6-6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
