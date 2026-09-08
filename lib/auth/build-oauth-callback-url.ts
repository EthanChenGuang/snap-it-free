/** Build absolute OAuth callback URL with safe relative `next` path (D-19-02, T-07-09). */
export function buildOAuthCallbackUrl(redirectTo: string, origin: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
}
