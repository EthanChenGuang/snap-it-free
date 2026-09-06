import { describe, expect, it } from 'vitest';
import { isUgcRateLimitDbError } from './insert-listing';

describe('isUgcRateLimitDbError', () => {
  it('detects the listings trigger message', () => {
    expect(isUgcRateLimitDbError(new Error('Rate limit exceeded: max 3 posts per 24 hours'))).toBe(
      true,
    );
  });

  it('ignores unrelated database errors', () => {
    expect(isUgcRateLimitDbError(new Error('duplicate key value'))).toBe(false);
    expect(isUgcRateLimitDbError(undefined)).toBe(false);
  });
});
