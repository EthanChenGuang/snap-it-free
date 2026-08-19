import { describe, expect, it } from 'vitest';
import { patchRefLengthNumericFilter } from './openfreemap-style';

describe('patchRefLengthNumericFilter', () => {
  it('wraps ref_length comparisons with coalesce', () => {
    const input = [
      'all',
      ['<=', ['get', 'ref_length'], 6],
      ['match', ['geometry-type'], ['LineString'], true, false],
    ];

    expect(patchRefLengthNumericFilter(input)).toEqual([
      'all',
      ['<=', ['coalesce', ['get', 'ref_length'], 999], 6],
      ['match', ['geometry-type'], ['LineString'], true, false],
    ]);
  });

  it('leaves unrelated filters unchanged', () => {
    const input = ['==', ['get', 'class'], 'motorway'];
    expect(patchRefLengthNumericFilter(input)).toEqual(input);
  });
});
