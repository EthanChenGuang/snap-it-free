'use client';

import { useEffect, useState } from 'react';
import type { AppLanguage } from '@/lib/settings/preferences';

const DEBOUNCE_MS = 350;

type UsePlaceLabelResult = {
  label: string;
  loading: boolean;
};

export function usePlaceLabel(
  lat: number,
  lng: number,
  language: AppLanguage,
  fallbackLabel: string,
  enabled = true,
): UsePlaceLabelResult {
  const [label, setLabel] = useState(fallbackLabel);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    setLabel(fallbackLabel);
    setLoading(true);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          lang: language,
        });
        const response = await fetch(`/api/geo/reverse?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setLabel(fallbackLabel);
          return;
        }
        const payload = (await response.json()) as { label?: string };
        setLabel(payload.label?.trim() || fallbackLabel);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLabel(fallbackLabel);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled, fallbackLabel, language, lat, lng]);

  return { label, loading };
}
