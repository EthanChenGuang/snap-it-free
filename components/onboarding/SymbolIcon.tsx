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
