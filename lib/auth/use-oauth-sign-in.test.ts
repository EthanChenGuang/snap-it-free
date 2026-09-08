import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const useOAuthSignInSource = readFileSync(
  resolve(__dirname, 'use-oauth-sign-in.ts'),
  'utf8',
);

describe('useOAuthSignIn', () => {
  it('supports Google OAuth only', () => {
    expect(useOAuthSignInSource).toMatch(/type OAuthProvider = 'google'/);
    expect(useOAuthSignInSource).not.toMatch(/facebook/);
    expect(useOAuthSignInSource).toMatch(/signInWithOAuth/);
  });
});
