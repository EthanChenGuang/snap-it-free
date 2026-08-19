import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPostDraft,
  dataUrlToPhotoFile,
  mergePostDraft,
  photoFilesToDataUrls,
  POST_DRAFT_STORAGE_KEY,
  readPostDraft,
  writePostDraft,
} from './storage';

const SAMPLE_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z';

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

  it('returns form-only draft without location coordinates', () => {
    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        title: '裤子',
        description: '灰色裤子',
        categorySlug: 'usato',
        condition: 'good',
      }),
    );
    expect(readPostDraft()).toEqual({
      title: '裤子',
      description: '灰色裤子',
      categorySlug: 'usato',
      condition: 'good',
      locationConfirmed: false,
    });
  });

  it('migrates legacy PostCategory and condition values', () => {
    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        category: 'tech',
        condition: 'new',
      }),
    );
    expect(readPostDraft()).toEqual({
      categorySlug: 'informatica',
      condition: 'brand_new',
      locationConfirmed: false,
    });
  });

  it('migrates legacy single photoDataUrl to photoDataUrls', () => {
    sessionStorage.setItem(
      POST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        title: 'test',
        photoDataUrl: SAMPLE_DATA_URL,
      }),
    );
    expect(readPostDraft()?.photoDataUrls).toEqual([SAMPLE_DATA_URL]);
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
  });

  it('returns null when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    expect(readPostDraft()).toBeNull();
    windowSpy.mockRestore();
  });
});

describe('mergePostDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('merges form fields without clearing existing location', () => {
    writePostDraft({ lat: 45.434, lng: 12.338, label: 'Venice' });
    mergePostDraft({ title: '椅子', description: '免费' });
    expect(readPostDraft()).toEqual({
      lat: 45.434,
      lng: 12.338,
      label: 'Venice',
      locationConfirmed: true,
      title: '椅子',
      description: '免费',
    });
  });

  it('merges location without clearing existing form fields', () => {
    mergePostDraft({
      title: '裤子',
      description: '灰色',
      categorySlug: 'usato',
      condition: 'good',
    });
    writePostDraft({ lat: 45.434, lng: 12.338, label: 'Venice' });
    expect(readPostDraft()).toEqual({
      title: '裤子',
      description: '灰色',
      categorySlug: 'usato',
      condition: 'good',
      lat: 45.434,
      lng: 12.338,
      label: 'Venice',
      locationConfirmed: true,
    });
  });

  it('persists multiple photoDataUrls', () => {
    mergePostDraft({ photoDataUrls: [SAMPLE_DATA_URL, SAMPLE_DATA_URL] });
    expect(readPostDraft()?.photoDataUrls).toHaveLength(2);
  });

  it('does not overwrite existing title with empty partial', () => {
    mergePostDraft({ title: '裤子' });
    mergePostDraft({ title: '' });
    expect(readPostDraft()?.title).toBe('裤子');
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
    });
    expect(readPostDraft()?.locationConfirmed).toBe(true);
  });

  it('is a no-op when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    const input = { lat: 45.434, lng: 12.338, label: 'Venice' };
    expect(writePostDraft(input)).toEqual(
      expect.objectContaining({
        lat: 45.434,
        lng: 12.338,
        label: 'Venice',
        locationConfirmed: true,
      }),
    );
    windowSpy.mockRestore();
  });
});

describe('photoFilesToDataUrls', () => {
  it('encodes valid image files', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', {
      type: 'image/png',
    });
    const urls = await photoFilesToDataUrls([file]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/^data:image\//);
  });
});

describe('dataUrlToPhotoFile', () => {
  it('round-trips a data URL to a File', async () => {
    const file = await dataUrlToPhotoFile(SAMPLE_DATA_URL);
    expect(file).toBeInstanceOf(File);
    expect(file?.type).toMatch(/^image\//);
  });
});

describe('persistDraft quota degradation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('sheds trailing photos instead of throwing when storage rejects the payload', () => {
    mergePostDraft({ title: '裤子', photoDataUrls: [SAMPLE_DATA_URL, SAMPLE_DATA_URL] });

    const original = Storage.prototype.setItem;
    let allowFrom = 0;
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key: string, value: string) {
        const photoCount = (value.match(/data:image\//g) ?? []).length;
        if (photoCount > allowFrom) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      });

    allowFrom = 1;
    const result = mergePostDraft({
      photoDataUrls: [SAMPLE_DATA_URL, SAMPLE_DATA_URL, SAMPLE_DATA_URL],
    });

    setItemSpy.mockRestore();

    expect(result.photoDataUrls).toHaveLength(1);
    expect(readPostDraft()?.photoDataUrls).toHaveLength(1);
    expect(readPostDraft()?.title).toBe('裤子');
  });

  it('keeps text fields when every photo has to be dropped', () => {
    const original = Storage.prototype.setItem;
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (value.includes('data:image/')) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      });

    const result = mergePostDraft({ title: '椅子', photoDataUrls: [SAMPLE_DATA_URL] });

    setItemSpy.mockRestore();

    expect(result.photoDataUrls).toEqual([]);
    expect(readPostDraft()?.title).toBe('椅子');
  });
});

describe('mergePostDraft photo isolation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('preserves stored photos when a partial omits photoDataUrls', () => {
    mergePostDraft({ photoDataUrls: [SAMPLE_DATA_URL, SAMPLE_DATA_URL] });
    mergePostDraft({ title: 'typing…', condition: 'good' });
    expect(readPostDraft()?.photoDataUrls).toHaveLength(2);
  });

  it('clears stored photos only when photoDataUrls is explicitly empty', () => {
    mergePostDraft({ photoDataUrls: [SAMPLE_DATA_URL] });
    mergePostDraft({ photoDataUrls: [] });
    expect(readPostDraft()?.photoDataUrls ?? []).toEqual([]);
  });
});

describe('clearPostDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('removes stored draft', () => {
    mergePostDraft({ title: 'test' });
    clearPostDraft();
    expect(readPostDraft()).toBeNull();
  });
});
