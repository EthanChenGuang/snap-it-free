import { describe, expect, it } from 'vitest';
import { resolveSourceRun } from './worker-placeholder.js';

describe('coming_soon source placeholder (D-05)', () => {
  it('returns skipped status without HTTP for coming_soon sources', () => {
    const result = resolveSourceRun({
      implementation_status: 'coming_soon',
      enabled: true,
    });
    expect(result).toEqual({
      action: 'skipped',
      message: 'Coming soon — crawler not implemented',
    });
  });

  it('runs live enabled sources', () => {
    expect(
      resolveSourceRun({ implementation_status: 'live', enabled: true }),
    ).toEqual({ action: 'run' });
  });

  it('skips disabled sources for scheduled runs', () => {
    expect(
      resolveSourceRun({ implementation_status: 'live', enabled: false }),
    ).toEqual({ action: 'skipped', message: 'Source disabled' });
  });

  it('allows manual runs when source is disabled', () => {
    expect(
      resolveSourceRun({ implementation_status: 'live', enabled: false }, { manual: true }),
    ).toEqual({ action: 'run' });
  });
});
