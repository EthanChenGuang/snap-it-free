import { describe, expect, it } from 'vitest';
import { buildCardMetadata } from './card-metadata';

describe('buildCardMetadata', () => {
  it('renders posted time only', () => {
    expect(
      buildCardMetadata({
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('3h ago');
  });

  it('appends reserved suffix when claimed (D-17)', () => {
    expect(
      buildCardMetadata({
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: 'Reserved',
      }),
    ).toBe('3h ago · Reserved');
  });

  it('returns posted time when claimed but reservedLabel empty', () => {
    expect(
      buildCardMetadata({
        postedLabel: '3h ago',
        isClaimed: true,
        reservedLabel: '',
      }),
    ).toBe('3h ago');
  });

  it('does not append reservedLabel when not claimed', () => {
    expect(
      buildCardMetadata({
        postedLabel: '3h ago',
        isClaimed: false,
        reservedLabel: 'Reserved',
      }),
    ).toBe('3h ago');
  });
});
