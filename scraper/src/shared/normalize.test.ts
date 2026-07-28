import { describe, expect, it } from 'vitest';
import { isMislabeledFree } from './free-filter.js';

describe('isMislabeledFree', () => {
  it('rejects titles with euro price markers', () => {
    const reason = isMislabeledFree('Divano €50 in buone condizioni');
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/price pattern/i);
  });

  it('passes clean free listing titles', () => {
    expect(isMislabeledFree('regalo divano')).toBeNull();
  });
});
