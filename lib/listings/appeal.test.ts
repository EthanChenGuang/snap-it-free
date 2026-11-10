import { describe, expect, it } from 'vitest';
import { APPEAL_WINDOW_MS, appealKind, isAppealing, rankByAppeal } from './appeal';

const at = (hoursAgo: number) => new Date(Date.UTC(2026, 10, 9, 12) - hoursAgo * 3600_000).toISOString();
const row = (id: string, title: string, hoursAgo: number, category = 'arredamento-casalinghi') => ({
  id,
  title,
  category,
  photo_url: 'https://images.sbito.it/a.jpg',
  status: 'active' as const,
  posted_at: at(hoursAgo),
});

describe('isAppealing', () => {
  it('lifts pets and clearly named desirable objects', () => {
    expect(isAppealing(row('a', 'Gatto europeo', 0, 'animali'))).toBe(true);
    expect(isAppealing(row('b', 'Divano letto 3 posti', 0))).toBe(true);
    expect(isAppealing(row('c', 'Notebook Lenovo', 0, 'informatica'))).toBe(true);
    expect(isAppealing(row('d', 'Lavatrice Samsung 8kg', 0, 'elettrodomestici'))).toBe(true);
  });

  it('does not lift parts, accessories, broken or reserved items', () => {
    expect(isAppealing(row('e', '2 supporti muro per tv', 0, 'elettrodomestici'))).toBe(false);
    expect(isAppealing(row('f', 'lampadario fatto con 3 barattoli', 0))).toBe(false);
    expect(isAppealing(row('g', 'Materasso letto singolo', 0))).toBe(false);
    expect(isAppealing(row('h', 'Lavatrice non funzionante', 0))).toBe(false);
    expect(isAppealing({ ...row('i', 'Divano', 0), status: 'claimed' })).toBe(false);
    expect(isAppealing(row('j', 'Piastrelle 20x20', 0))).toBe(false);
    expect(isAppealing(row('k', 'Letto matrimoniale bianco [GIÀ PRENOTATO]', 0))).toBe(false);
  });
});

describe('appealKind with an AI score', () => {
  it('lets the score override the keyword rules', () => {
    expect(appealKind({ ...row('a', 'Piastrelle', 0), appeal_score: 5 })).toBe('object');
    expect(appealKind({ ...row('b', 'Divano', 0), appeal_score: 2 })).toBe('other');
    expect(appealKind({ ...row('c', 'Gatto', 0, 'animali'), appeal_score: 3 })).toBe('pet');
    expect(appealKind({ ...row('d', 'Gatto', 0, 'animali'), appeal_score: 1 })).toBe('other');
    expect(appealKind({ ...row('e', 'Divano', 0), appeal_score: null })).toBe('object');
  });
});

describe('rankByAppeal', () => {
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it('leads each 12-hour block with two objects, a pet, then an ordinary item', () => {
    const ranked = rankByAppeal([
      row('o1', 'Piastrelle', 1),
      row('o2', 'Barattoli', 2),
      row('p1', 'Gattino', 3, 'animali'),
      row('s1', 'Divano', 4),
      row('s2', 'Tavolo', 5),
      row('s3', 'Armadio', 6),
    ]);
    expect(ids(ranked)).toEqual(['s1', 's2', 'p1', 'o1', 's3', 'o2']);
  });

  it('never lifts an item above a newer block', () => {
    const old = APPEAL_WINDOW_MS / 3600_000 + 2;
    const ranked = rankByAppeal([row('new', 'Piastrelle', 1), row('old-sofa', 'Divano', old)]);
    expect(ids(ranked)).toEqual(['new', 'old-sofa']);
  });

  it('keeps every item exactly once', () => {
    const input = Array.from({ length: 30 }, (_, i) => row(`x${i}`, i % 3 ? 'Piastrelle' : 'Divano', i));
    const ranked = rankByAppeal(input);
    expect(new Set(ids(ranked)).size).toBe(30);
    expect(ranked).toHaveLength(30);
  });
});
