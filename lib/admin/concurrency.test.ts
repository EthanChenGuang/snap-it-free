import { describe, expect, it, vi } from 'vitest';
import { runWithConcurrencyLimit } from './concurrency';

describe('runWithConcurrencyLimit', () => {
  it('runs every item exactly once', async () => {
    const seen: number[] = [];
    await runWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item);
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('never exceeds the configured concurrency', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await runWithConcurrencyLimit(Array.from({ length: 12 }, (_, i) => i), 4, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
    });

    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  it('no-ops on empty input', async () => {
    const worker = vi.fn();
    await runWithConcurrencyLimit([], 4, worker);
    expect(worker).not.toHaveBeenCalled();
  });
});
