import { describe, expect, it } from 'vitest';
import { isRestJwtError, restErrorResponse } from './rest-error';

describe('isRestJwtError', () => {
  it('detects PostgREST JWT verify failures', () => {
    expect(isRestJwtError('JWT issued at future')).toBe(true);
    expect(isRestJwtError('JWSError (CompactDecodeError)')).toBe(true);
    expect(isRestJwtError('No suitable key was found')).toBe(true);
    expect(isRestJwtError(undefined, 'PGRST303')).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isRestJwtError('relation "user_favorites" does not exist')).toBe(false);
    expect(isRestJwtError(undefined)).toBe(false);
  });
});

describe('restErrorResponse', () => {
  it('maps JWT errors to 401', async () => {
    const response = restErrorResponse({ message: 'JWT issued at future' });
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
