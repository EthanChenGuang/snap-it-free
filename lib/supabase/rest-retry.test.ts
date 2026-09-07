import { describe, expect, it, vi } from 'vitest';
import { withRestRetry } from './rest-retry';

const transient = { message: 'JWT issued at future', code: 'PGRST303' };

describe('withRestRetry', () => {
  it('returns the first success without retrying', async () => {
    const run = vi.fn().mockResolvedValue({ data: [1], error: null });

    const result = await withRestRetry(run, { delayMs: 0 });

    expect(result).toEqual({ data: [1], error: null });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries a transient rejection and returns the eventual success', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: transient })
      .mockResolvedValueOnce({ data: [1], error: null });

    const result = await withRestRetry(run, { delayMs: 0 });

    expect(result.error).toBeNull();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt budget and surfaces the last error', async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: transient });

    const result = await withRestRetry(run, { delayMs: 0 });

    expect(result.error).toEqual(transient);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient errors', async () => {
    const error = { message: 'No suitable key was found' };
    const run = vi.fn().mockResolvedValue({ data: null, error });

    const result = await withRestRetry(run, { delayMs: 0 });

    expect(result.error).toEqual(error);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('honours a custom attempt count', async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: transient });

    await withRestRetry(run, { attempts: 5, delayMs: 0 });

    expect(run).toHaveBeenCalledTimes(5);
  });
});
