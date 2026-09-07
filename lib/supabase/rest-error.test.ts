import { describe, expect, it } from 'vitest';
import { isRestJwtError, isTransientRestError, restErrorResponse } from './rest-error';

describe('isTransientRestError', () => {
  it('detects PostgREST stale-clock rejections', () => {
    expect(isTransientRestError(undefined, 'PGRST303')).toBe(true);
    expect(isTransientRestError('JWT issued at future')).toBe(true);
  });

  it('ignores real JWT failures and unrelated errors', () => {
    expect(isTransientRestError('JWSError (CompactDecodeError)')).toBe(false);
    expect(isTransientRestError(undefined, 'PGRST301')).toBe(false);
    expect(isTransientRestError(undefined)).toBe(false);
  });
});

describe('isRestJwtError', () => {
  it('detects tokens PostgREST cannot verify', () => {
    expect(isRestJwtError('JWSError (CompactDecodeError)')).toBe(true);
    expect(isRestJwtError('No suitable key was found')).toBe(true);
    expect(isRestJwtError(undefined, 'PGRST301')).toBe(true);
  });

  it('does not claim the session is invalid on a transient rejection', () => {
    expect(isRestJwtError('JWT issued at future')).toBe(false);
    expect(isRestJwtError(undefined, 'PGRST303')).toBe(false);
  });

  it('ignores unrelated errors', () => {
    expect(isRestJwtError('relation "user_favorites" does not exist')).toBe(false);
    expect(isRestJwtError(undefined)).toBe(false);
  });
});

describe('restErrorResponse', () => {
  it('maps transient rejections to 503 rather than signing the user out', async () => {
    const response = restErrorResponse({ message: 'JWT issued at future', code: 'PGRST303' });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Service temporarily unavailable' });
  });

  it('prefers 503 over 401 when PostgREST sends PGRST303 as HTTP 401', () => {
    const response = restErrorResponse({ message: '', code: 'PGRST303' }, { httpStatus: 401 });
    expect(response.status).toBe(503);
  });

  it('maps unverifiable tokens to 401', async () => {
    const response = restErrorResponse({ message: 'No suitable key was found' });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Session invalid' });
  });

  it('maps empty-message 401 to session invalid', () => {
    const response = restErrorResponse({ message: '' }, { httpStatus: 401 });
    expect(response.status).toBe(401);
  });

  it('passes through other errors', async () => {
    const response = restErrorResponse({ message: 'timeout' }, { fallbackStatus: 503 });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'timeout' });
  });
});
