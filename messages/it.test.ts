import { describe, expect, it } from 'vitest';
import { messages } from './it';

describe('messages/it safety and dm copy', () => {
  it('exposes safety modal strings in Italian', () => {
    expect(messages.safety.modalTitle.length).toBeGreaterThan(0);
    expect(messages.safety.bullet1.length).toBeGreaterThan(0);
    expect(messages.safety.bullet2.length).toBeGreaterThan(0);
    expect(messages.safety.bullet2).toMatch(/app/i);
  });

  it('exposes dm banner short copy', () => {
    expect(messages.dm.bannerShort.length).toBeGreaterThan(0);
    expect(messages.safety.bannerShort.length).toBeGreaterThan(0);
  });
});
