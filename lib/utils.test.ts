import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('keeps text-on-primary when merged with custom size text-label-sm (active chip)', () => {
    // Reproduces buttonVariants('chipActive', 'sm') class ordering: base
    // classes (with text-label-md), then variant classes (with the real
    // color class text-on-primary), then size classes (with text-label-sm).
    const result = cn(
      'text-label-md',
      'bg-primary text-on-primary border border-primary',
      'h-8 px-space-sm text-label-sm',
    );

    expect(result).toContain('text-on-primary');
    expect(result).toContain('text-label-sm');
  });

  it('keeps text-on-surface when merged with custom size text-label-sm (inactive chip)', () => {
    // Same shape as above but for the inactive/unselected chip variant.
    const result = cn(
      'text-label-md',
      'bg-surface text-on-surface border border-outline-variant',
      'h-8 px-space-sm text-label-sm',
    );

    expect(result).toContain('text-on-surface');
    expect(result).toContain('text-label-sm');
  });

  it('still resolves a genuine same-scale font-size conflict', () => {
    expect(cn('text-label-md', 'text-label-sm')).toBe('text-label-sm');
  });

  it('leaves ordinary Tailwind conflict resolution unaffected', () => {
    expect(cn('px-2 px-4')).toBe('px-4');
  });
});
