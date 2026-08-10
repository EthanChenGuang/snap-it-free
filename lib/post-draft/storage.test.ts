import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  POST_DRAFT_STORAGE_KEY,
  readPostDraft,
  writePostDraft,
} from './storage';

describe('readPostDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when sessionStorage is empty', () => {
    expect(readPostDraft()).toBeNull();
  });

  it('returns null when the stored JSON is corrupt', () => {
    sessionStorage.setItem(POST_DRAFT_STORAGE_KEY, '{not-json');
    expect(readPostDraft()).toBeNull();
  });

  it('returns null when lat is out of [-90,90] or lng is out of [-180,180]', () => {
    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({ lat: 91, lng: 12.33, locationConfirmed: true }),
    );
    expect(readPostDraft()).toBeNull();

    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({ lat: 45.44, lng: 181, locationConfirmed: true }),
    );
    expect(readPostDraft()).toBeNull();
  });

  it('returns object with locationConfirmed false when flag is missing or not strictly true', () => {
    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({ lat: 45.434, lng: 12.338, label: 'Venice' }),
    );
    expect(readPostDraft()).toEqual({
      lat: 45.434,
      lng: 12.338,
      label: 'Venice',
      locationConfirmed: false,
    });

    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        lat: 45.434,
        lng: 12.338,
        label: 'Venice',
        locationConfirmed: false,
      }),
    );
    expect(readPostDraft()).toEqual({
      lat: 45.434,
      lng: 12.338,
      label: 'Venice',
      locationConfirmed: false,
    });
  });

  it('returns null when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    expect(readPostDraft()).toBeNull();
    windowSpy.mockRestore();
  });
});

describe('writePostDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trip preserves lat/lng/label and always sets locationConfirmed true', () => {
    const written = writePostDraft({
      lat: 45.434,
      lng: 12.338,
      label: 'Venice',
    });
    expect(written).toEqual({
      lat: 45.434,
      lng: 12.338,
      label: 'Venice',
      locationConfirmed: true,
    });
    expect(readPostDraft()).toEqual(written);
  });

  it('always persists locationConfirmed true even if caller omits or sets false', () => {
    writePostDraft({
      lat: 45.41,
      lng: 11.88,
      label: 'Padova',
      // @ts-expect-error — writePostDraft ignores caller locationConfirmed
      locationConfirmed: false,
    });
    expect(readPostDraft()?.locationConfirmed).toBe(true);

    const raw = sessionStorage.getItem(POST_DRAFT_STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual({
      lat: 45.41,
      lng: 11.88,
      label: 'Padova',
      locationConfirmed: true,
    });
  });

  it('is a no-op when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    const input = { lat: 45.434, lng: 12.338, label: 'Venice' };
    expect(writePostDraft(input)).toEqual(input);
    windowSpy.mockRestore();
  });
});
