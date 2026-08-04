import { describe, expect, it } from 'vitest';
import { messages as en } from './en';
import { messages as itCatalog } from './it';
import { messages as zh } from './zh';

function collectKeyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || value === undefined) {
    return prefix ? [prefix] : [];
  }

  if (typeof value === 'function') {
    return prefix ? [prefix] : [];
  }

  if (typeof value === 'string') {
    return prefix ? [prefix] : [];
  }

  if (typeof value !== 'object') {
    return prefix ? [prefix] : [];
  }

  const paths: string[] = [];
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    paths.push(...collectKeyPaths((value as Record<string, unknown>)[key], nextPrefix));
  }
  return paths;
}

function leafKind(value: unknown): 'string' | 'function' | 'object' {
  if (typeof value === 'function') return 'function';
  if (typeof value === 'string') return 'string';
  return 'object';
}

function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe('message catalog key parity', () => {
  const catalogs = { zh, en, it: itCatalog } as const;

  it('zh, en, and it share identical nested key paths', () => {
    const zhPaths = collectKeyPaths(zh);
    const enPaths = collectKeyPaths(en);
    const itPaths = collectKeyPaths(itCatalog);

    expect(enPaths).toEqual(zhPaths);
    expect(itPaths).toEqual(zhPaths);
  });

  it('leaf nodes are strings or functions consistently across catalogs', () => {
    const zhPaths = collectKeyPaths(zh);

    for (const path of zhPaths) {
      const kinds = Object.values(catalogs).map((catalog) =>
        leafKind(getAtPath(catalog as unknown as Record<string, unknown>, path)),
      );
      expect(new Set(kinds).size).toBe(1);
      expect(['string', 'function']).toContain(kinds[0]);
    }
  });

  it('exposes app.description in all catalogs', () => {
    for (const catalog of Object.values(catalogs)) {
      expect(typeof catalog.app.description).toBe('string');
      expect(catalog.app.description.length).toBeGreaterThan(0);
    }
  });
});
