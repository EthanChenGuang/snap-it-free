import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCachedDraftPhotos,
  getCachedDraftPhotos,
  setCachedDraftPhotos,
} from './photo-cache';

function makeFile(name: string): File {
  return new File([new Uint8Array([255, 216, 255])], name, { type: 'image/jpeg' });
}

describe('photo-cache', () => {
  beforeEach(() => {
    clearCachedDraftPhotos();
  });

  it('starts empty', () => {
    expect(getCachedDraftPhotos()).toEqual([]);
  });

  it('hands the original Files back across a navigation round-trip', () => {
    const files = [makeFile('a.jpg'), makeFile('b.jpg')];
    setCachedDraftPhotos(files);

    const restored = getCachedDraftPhotos();
    expect(restored).toHaveLength(2);
    expect(restored[0]).toBe(files[0]);
    expect(restored[1]).toBe(files[1]);
  });

  it('replaces the cache rather than appending', () => {
    setCachedDraftPhotos([makeFile('a.jpg'), makeFile('b.jpg')]);
    setCachedDraftPhotos([makeFile('c.jpg')]);
    expect(getCachedDraftPhotos().map((file) => file.name)).toEqual(['c.jpg']);
  });

  it('clears after a successful submit', () => {
    setCachedDraftPhotos([makeFile('a.jpg')]);
    clearCachedDraftPhotos();
    expect(getCachedDraftPhotos()).toEqual([]);
  });
});
