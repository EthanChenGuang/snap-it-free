import { describe, expect, it } from 'vitest';
import { messages as itMessages } from '@/messages/it';
import { parseUgcDescriptionMeta, stripUgcDescriptionMeta } from './description-meta';

describe('parseUgcDescriptionMeta', () => {
  it('extracts category and condition from meta lines', () => {
    const description = [
      'Categoria: Tutto per i bambini',
      'Condizione: Buono',
      '',
      'test03 description',
    ].join('\n');

    expect(parseUgcDescriptionMeta(description, itMessages)).toEqual({
      categoryLabel: 'Tutto per i bambini',
      conditionLabel: 'Buono',
    });
  });

  it('returns nulls when description is empty', () => {
    expect(parseUgcDescriptionMeta(null, itMessages)).toEqual({
      categoryLabel: null,
      conditionLabel: null,
    });
  });
});

describe('stripUgcDescriptionMeta', () => {
  it('removes category and condition meta lines', () => {
    const description = [
      'Categoria: Tutto per i bambini',
      'Condizione: Buono',
      '',
      'test03 description',
    ].join('\n');

    expect(stripUgcDescriptionMeta(description, itMessages)).toBe('test03 description');
  });
});
