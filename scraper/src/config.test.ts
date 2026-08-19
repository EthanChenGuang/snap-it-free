import { afterEach, describe, expect, it } from 'vitest';
import { getProxyUrl, resolveCrawlerProxyUrl } from './config.js';

describe('resolveCrawlerProxyUrl', () => {
  const originalProxyUrl = process.env.PROXY_URL;

  afterEach(() => {
    if (originalProxyUrl === undefined) {
      delete process.env.PROXY_URL;
    } else {
      process.env.PROXY_URL = originalProxyUrl;
    }
  });

  it('uses param override when options override is undefined', () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    expect(resolveCrawlerProxyUrl(undefined, 'http://param-proxy.example:8080')).toBe(
      'http://param-proxy.example:8080',
    );
  });

  it('prefers options override over param and env', () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    expect(
      resolveCrawlerProxyUrl('http://options-proxy.example:8080', 'http://param-proxy.example:8080'),
    ).toBe('http://options-proxy.example:8080');
  });

  it('treats empty options override as explicit direct crawl', () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    expect(resolveCrawlerProxyUrl('', 'http://param-proxy.example:8080')).toBeUndefined();
  });

  it('falls back to PROXY_URL env when no overrides are set', () => {
    process.env.PROXY_URL = 'http://env-proxy.example:8080';
    expect(resolveCrawlerProxyUrl()).toBe('http://env-proxy.example:8080');
    expect(getProxyUrl()).toBe('http://env-proxy.example:8080');
  });
});
