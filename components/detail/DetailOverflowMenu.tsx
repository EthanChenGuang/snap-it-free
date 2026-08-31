'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailOverflowMenuProps = {
  onReport: () => void;
  triggerClassName?: string;
};

export function DetailOverflowMenu({ onReport, triggerClassName }: DetailOverflowMenuProps) {
  const { messages } = useMessages();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleReport = () => {
    setOpen(false);
    onReport();
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-label={messages.report.menuTrigger}
        aria-expanded={open}
        aria-haspopup="menu"
        className={triggerClassName}
      >
        <span className="material-symbols-outlined text-primary">more_horiz</span>
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-space-xs min-w-[200px] rounded border border-outline-variant bg-surface py-space-xs"
        >
          <button
            type="button"
            role="menuitem"
            className="listing-detail-menu-item w-full px-space-md py-space-sm text-left text-label-md text-on-surface hover:bg-surface-container-low"
            onClick={handleReport}
          >
            {messages.report.menuItem}
          </button>
        </div>
      )}
    </div>
  );
}
