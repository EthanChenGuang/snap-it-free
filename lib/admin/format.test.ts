import { describe, expect, it } from 'vitest';
import { formatRomeTooltip, formatUtcTimestamp } from './format';

describe('formatUtcTimestamp', () => {
  it('formats UTC instant as Europe/Rome local time in summer (CEST)', () => {
    expect(formatUtcTimestamp('2026-08-12T15:16:40.823Z')).toBe('2026-08-12 17:16:40 罗马');
  });

  it('formats UTC instant as Europe/Rome local time in winter (CET)', () => {
    expect(formatUtcTimestamp('2026-01-15T12:00:00.000Z')).toBe('2026-01-15 13:00:00 罗马');
  });
});

describe('formatRomeTooltip', () => {
  it('shows UTC for hover reference', () => {
    expect(formatRomeTooltip('2026-08-12T15:16:40.823Z')).toBe('2026-08-12 15:16:40 UTC');
  });
});
