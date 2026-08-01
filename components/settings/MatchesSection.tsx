'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { MatchListItem } from '@/app/api/alerts/matches/route';
import { createClient } from '@/lib/supabase/client';
import { messages, zoneLabel } from '@/messages/it';

function matchSummary(match: MatchListItem): string {
  const parts: string[] = [];
  if (match.keyword) parts.push(match.keyword);
  if (match.alertZone) {
    parts.push(zoneLabel(match.alertZone));
  } else if (!match.keyword) {
    parts.push(zoneLabel('All'));
  } else {
    parts.push(messages.settings.alerts.allZonesShort);
  }
  return parts.join(' · ');
}

async function markMatchRead(listingId: string): Promise<void> {
  await fetch(`/api/alerts/matches/${listingId}/read`, { method: 'POST' });
}

export function MatchesSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setError(null);
    const response = await fetch('/api/alerts/matches');
    if (response.status === 401) {
      setMatches([]);
      return;
    }
    if (!response.ok) {
      setError(messages.settings.matches.loadError);
      return;
    }
    const payload = (await response.json()) as { matches: MatchListItem[] };
    setMatches(payload.matches ?? []);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const loggedIn = Boolean(user);
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        loadMatches().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [loadMatches]);

  const handleOpen = (listingId: string) => {
    void markMatchRead(listingId);
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <section id="matches" className="mb-space-xl scroll-mt-space-lg">
      <div className="mb-space-md">
        <h2 className="ml-space-xs text-label-md uppercase tracking-wider text-on-secondary-container">
          {messages.settings.matches.sectionTitle}
        </h2>
      </div>

      <div className="overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
        {loading ? (
          <div className="p-space-md">
            <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="p-space-md">
            <p className="text-body-md font-medium text-on-surface">{messages.settings.matches.emptyTitle}</p>
            <p className="mt-space-xs text-label-sm text-secondary">
              {messages.settings.matches.emptyDescription}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {matches.map((match) => (
              <li key={match.listingId}>
                <Link
                  href={`/listing/${match.listingId}`}
                  onClick={() => handleOpen(match.listingId)}
                  className="flex flex-col gap-space-xs p-space-md transition-colors hover:bg-surface-container/60"
                >
                  <p className="truncate text-body-md font-medium text-on-surface">{match.title}</p>
                  <p className="text-label-sm text-secondary">
                    {match.zone ? zoneLabel(match.zone) : messages.settings.matches.zoneUnknown}
                    {' · '}
                    {matchSummary(match)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="border-t border-outline-variant p-space-md">
            <p className="text-label-sm text-error">{error}</p>
          </div>
        )}
      </div>
    </section>
  );
}
