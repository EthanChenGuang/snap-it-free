import { describe, expect, it } from 'vitest';
import { messages } from './zh';

// Chinese typography: no space hugging a Chinese city name, but keep a space on
// each side of a Latin numeral (pangu spacing). Guang-approved 261029 follow-up.
describe('messages/zh city interpolation spacing', () => {
  it('paywall headline hugs the city and spaces the number', () => {
    expect(messages.paywall.titlePersonalized(355, '威尼斯')).toBe('解锁威尼斯的 355 件免费物品');
  });

  it('feed-ready preview result hugs the city', () => {
    expect(messages.onboarding.preview.result(355, '威尼斯')).toBe('威尼斯此刻有 355 件免费物品');
  });

  it('feed-ready preview low-supply hugs the city', () => {
    expect(messages.onboarding.preview.lowSupply(3, '威尼斯')).toBe('威尼斯目前只有 3 件。可以扩大范围或换个城市。');
  });

  it('alerts mock line hugs the city', () => {
    expect(messages.onboarding.alerts.mockLine2('威尼斯')).toBe('威尼斯有新的免费物品');
  });
});
