import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BROWSE_CENTER_STORAGE_KEY,
  clearBrowseCenter,
  readBrowseCenter,
  writeBrowseCenter,
} from './storage';

describe('readBrowseCenter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when storage is empty', () => {
    expect(readBrowseCenter()).toBeNull();
  });

  it('write/read round-trip preserves lat/lng/label', () => {
    const center = { lat: 45.434, lng: 12.338, label: 'Historic Center' };
    writeBrowseCenter(center);
    expect(readBrowseCenter()).toEqual(center);
  });

  it('returns null when JSON is corrupt', () => {
    localStorage.setItem(BROWSE_CENTER_STORAGE_KEY, '{not-json');
    expect(readBrowseCenter()).toBeNull();
  });

  it('rejects out-of-range lat (>90) on read', () => {
    localStorage.setItem(
      BROWSE_CENTER_STORAGE_KEY,
      JSON.stringify({ lat: 91, lng: 12.33 }),
    );
    expect(readBrowseCenter()).toBeNull();
  });

  it('returns null when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    expect(readBrowseCenter()).toBeNull();
    windowSpy.mockRestore();
  });
});

describe('writeBrowseCenter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('dispatches change event for cross-tab sync', () => {
    const handler = vi.fn();
    window.addEventListener('shoumanwu-browse-center-change', handler);
    writeBrowseCenter({ lat: 45.41, lng: 11.88, label: 'Padova' });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('shoumanwu-browse-center-change', handler);
  });
});

describe('clearBrowseCenter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes storage key and readBrowseCenter returns null (D-12)', () => {
    writeBrowseCenter({ lat: 45.434, lng: 12.338, label: 'Historic Center' });
    clearBrowseCenter();
    expect(localStorage.getItem(BROWSE_CENTER_STORAGE_KEY)).toBeNull();
    expect(readBrowseCenter()).toBeNull();
  });

  it('dispatches change event on clear', () => {
    writeBrowseCenter({ lat: 45.434, lng: 12.338 });
    const handler = vi.fn();
    window.addEventListener('shoumanwu-browse-center-change', handler);
    clearBrowseCenter();
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('shoumanwu-browse-center-change', handler);
  });
});
