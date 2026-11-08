'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { featuredReviewMessages as m } from '@/components/admin/admin-messages';
import type { FeaturedDecision, PendingFeaturedCandidate } from '@/lib/featured/admin';

const UNDO_MS = 5000;

type Queued = { candidate: PendingFeaturedCandidate; decision: FeaturedDecision; timer: ReturnType<typeof setTimeout> };

async function sendDecision(id: string, decision: FeaturedDecision): Promise<'ok' | 'conflict' | 'error'> {
  try {
    const res = await fetch(`/api/admin/featured/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision }),
      keepalive: true,
    });
    if (res.ok) return 'ok';
    return res.status === 409 ? 'conflict' : 'error';
  } catch {
    return 'error';
  }
}

/**
 * Phone-first, one-at-a-time review. A decision is held for 5 s (undo window) before it is sent,
 * because rejecting deletes the processed image server-side.
 */
export function FeaturedReviewClient({ initialCandidates }: { initialCandidates: PendingFeaturedCandidate[] }) {
  const [queue, setQueue] = useState(initialCandidates);
  const [held, setHeld] = useState<Queued | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const heldRef = useRef<Queued | null>(null);
  useEffect(() => {
    heldRef.current = held;
  }, [held]);

  const commit = useCallback(async (q: Queued) => {
    clearTimeout(q.timer);
    setHeld((h) => (h?.candidate.id === q.candidate.id ? null : h));
    const result = await sendDecision(q.candidate.id, q.decision);
    if (result === 'error') {
      setQueue((prev) => [q.candidate, ...prev]);
      setNotice(m.saveFailed);
    } else if (result === 'conflict') {
      setNotice(m.alreadyDecided);
    }
  }, []);

  // Never lose a held decision when the page is hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (heldRef.current) void commit(heldRef.current);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [commit]);

  const decide = (decision: FeaturedDecision) => {
    const candidate = queue[0];
    if (!candidate) return;
    if (held) void commit(held);
    setNotice(null);
    const q: Queued = { candidate, decision, timer: setTimeout(() => void commit(q), UNDO_MS) };
    setHeld(q);
    setQueue((prev) => prev.slice(1));
  };

  const undo = () => {
    if (!held) return;
    clearTimeout(held.timer);
    setQueue((prev) => [held.candidate, ...prev]);
    setHeld(null);
  };

  const current = queue[0];

  return (
    <div className="mx-auto w-full max-w-[440px] pb-28">
      <header className="mb-4">
        <h1 className="text-h3 font-semibold text-primary">{m.pageTitle}</h1>
        <p className="mt-1 text-label-md text-secondary">{m.pageSubtitle}</p>
        {current && (
          <p className="mt-2 text-label-sm text-secondary" aria-live="polite">
            {current.consumerCity} · {m.remaining(queue.length)}
          </p>
        )}
      </header>

      {notice && (
        <p role="status" className="mb-3 rounded-md border border-outline-variant bg-surface-container px-3 py-2 text-label-md text-primary">
          {notice}
        </p>
      )}

      {current ? (
        <article key={current.id} className="space-y-3">
          <figure>
            <figcaption className="mb-1 text-label-sm text-secondary">{m.studioLabel}</figcaption>
            <div className="aspect-[4/5] w-full overflow-hidden rounded-[14px] bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.studioUrl} alt={current.title} className="h-full w-full object-cover" />
            </div>
          </figure>
          <div className="flex items-start gap-3">
            <figure className="w-28 shrink-0">
              <figcaption className="mb-1 text-label-sm text-secondary">{m.originalLabel}</figcaption>
              <div className="aspect-square w-full overflow-hidden rounded-md bg-surface-container">
                {current.originalUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.originalUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-label-sm text-secondary">{m.originalMissing}</span>
                )}
              </div>
            </figure>
            <div className="min-w-0 pt-5">
              <p className="line-clamp-3 break-words text-body-md text-primary">{current.title}</p>
              {current.city && <p className="mt-1 text-label-sm text-secondary">{current.city}</p>}
              <a
                href={`/listing/${current.listingId}`}
                target="_blank"
                rel="noopener"
                className="mt-2 inline-block text-label-md text-secondary underline"
              >
                {m.viewListing}
              </a>
            </div>
          </div>
        </article>
      ) : (
        <div className="rounded-[14px] border border-outline-variant bg-surface px-4 py-10 text-center">
          <p className="text-body-md font-semibold text-primary">{m.empty}</p>
          <p className="mt-2 text-label-md text-secondary">{m.emptyHint}</p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:left-64">
        <div className="mx-auto max-w-[440px]">
          {held && (
            <div className="mb-2 flex items-center justify-between text-label-md text-secondary" aria-live="polite">
              <span>{held.decision === 'approve' ? m.approvedToast : m.rejectedToast}</span>
              <button type="button" onClick={undo} className="min-h-[44px] px-3 font-semibold text-primary underline">
                {m.undo}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!current}
              onClick={() => decide('reject')}
              className="min-h-[52px] rounded-md border border-outline-variant bg-surface text-body-md font-semibold text-primary transition-colors active:bg-surface-container-high disabled:opacity-40"
            >
              {m.reject}
            </button>
            <button
              type="button"
              disabled={!current}
              onClick={() => decide('approve')}
              className="min-h-[52px] rounded-md bg-primary text-body-md font-semibold text-on-primary transition-opacity active:opacity-80 disabled:opacity-40"
            >
              {m.approve}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
