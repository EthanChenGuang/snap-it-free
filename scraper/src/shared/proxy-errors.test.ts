import { describe, expect, it } from 'vitest';
import { CriticalError } from '@crawlee/core';
import {
  findProxyQuotaFatalError,
  getProxyFatalFailure,
  isProxyQuotaFatalError,
  ProxyQuotaFatalError,
} from './proxy-errors.js';

const SAMPLE_ERROR = `Detected a session error, rotating session...
Proxy responded with 407 Proxy Authentication Required: 136 bytes.

Below is the first 100 bytes of the proxy response body:
Access denied. You've reached your current traffic limit. Please contact support or your account man`;

describe('getProxyFatalFailure', () => {
  it('detects proxy traffic limit exhaustion from Crawlee SessionError text', () => {
    expect(getProxyFatalFailure(new Error(SAMPLE_ERROR))).toBe(
      'Proxy quota or account limit reached — check provider dashboard or top up traffic',
    );
  });

  it('detects DataImpulse-style 407 TRAFFIC_EXHAUSTED without response body', () => {
    expect(
      getProxyFatalFailure(
        new Error(`Detected a session error, rotating session...
Proxy responded with 407 TRAFFIC_EXHAUSTED: 0 bytes.

Below is the first 100 bytes of the proxy response body:
`),
      ),
    ).toBe(
      'Proxy quota or account limit reached — check provider dashboard or top up traffic',
    );
  });

  it('detects 402 payment required as quota exhaustion', () => {
    expect(
      getProxyFatalFailure(
        new Error(
          'Proxy responded with 402 Payment Required: Bandwidth limit reached. Please upgrade',
        ),
      ),
    ).toBe(
      'Proxy quota or account limit reached — check provider dashboard or top up traffic',
    );
  });
  it('returns null for transient session errors', () => {
    expect(
      getProxyFatalFailure(new Error('Detected a session error, rotating session... connection reset')),
    ).toBeNull();
  });

  it('detects generic access denied on 407', () => {
    expect(
      getProxyFatalFailure(
        new Error('Proxy responded with 407 Proxy Authentication Required: Access denied'),
      ),
    ).toBe('Proxy access denied (407) — verify credentials and account status');
  });
});

describe('ProxyQuotaFatalError', () => {
  it('carries fatalReason on construction', () => {
    const err = new ProxyQuotaFatalError('Proxy quota or account limit reached');
    expect(err.fatalReason).toBe('Proxy quota or account limit reached');
    expect(err.message).toBe('Proxy quota or account limit reached');
    expect(err.name).toBe('ProxyQuotaFatalError');
    expect(err).toBeInstanceOf(CriticalError);
  });
});

describe('isProxyQuotaFatalError', () => {
  it('returns true for ProxyQuotaFatalError instances', () => {
    expect(isProxyQuotaFatalError(new ProxyQuotaFatalError('quota'))).toBe(true);
  });

  it('returns false for generic Error', () => {
    expect(isProxyQuotaFatalError(new Error('quota'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isProxyQuotaFatalError(null)).toBe(false);
    expect(isProxyQuotaFatalError('quota')).toBe(false);
  });

  it('finds ProxyQuotaFatalError on error.cause chain', () => {
    const quota = new ProxyQuotaFatalError('quota exhausted');
    const wrapped = new Error('crawler failed', { cause: quota });
    expect(findProxyQuotaFatalError(wrapped)).toBe(quota);
    expect(isProxyQuotaFatalError(wrapped)).toBe(true);
  });
});
