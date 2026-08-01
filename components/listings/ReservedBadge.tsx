import { messages } from '@/messages/it';

export function ReservedBadge() {
  return (
    <span className="rounded-sm bg-surface-container-high px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
      {messages.listing.reserved}
    </span>
  );
}
