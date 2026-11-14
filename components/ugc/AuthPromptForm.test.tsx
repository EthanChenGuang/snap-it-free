import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, click, flush, render } from '@/components/test/render';
import { getMessages } from '@/messages';
import { AuthPromptForm } from './AuthPromptForm';

const signInWithOtp = vi.hoisted(() => vi.fn());
const verifyOtp = vi.hoisted(() => vi.fn());
const signIn = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOtp, verifyOtp } }) }));
vi.mock('@/lib/supabase/env', () => ({ getSupabaseEnv: () => ({ url: 'https://x.supabase.co', anonKey: 'anon' }) }));
vi.mock('@/lib/auth/use-oauth-sign-in', () => ({ useOAuthSignIn: () => ({ signIn, status: 'idle', isBusy: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));

const messages = getMessages('en');
const q = (id: string) => document.body.querySelector<HTMLInputElement>(`[data-testid="auth-prompt-${id}"]`);

async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  for (const m of [signInWithOtp, verifyOtp, signIn, replace, refresh]) m.mockReset();
  signInWithOtp.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
});
afterEach(async () => {
  await cleanup();
});

async function sendEmail(redirectTo: string) {
  await render(<AuthPromptForm redirectTo={redirectTo} />);
  await typeInto(q('email')!, 'a@b.it');
  await click(q('send'));
  await flush();
}

describe('AuthPromptForm email code flow', () => {
  it('shows a code input after sending, not the click-the-link text', async () => {
    await sendEmail('/');
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.it', options: { emailRedirectTo: expect.stringContaining('/auth/callback?next=') } }),
    );
    const code = q('code')!;
    expect(code).not.toBeNull();
    expect(code.inputMode).toBe('numeric');
    expect(code.autocomplete).toBe('one-time-code');
    expect(document.body.textContent).not.toContain('click the link');
    expect(document.body.textContent).toContain(messages.emailCode.sentHint);
  });

  it('verifies the code and refreshes when already on the redirect page', async () => {
    await sendEmail('/');
    await typeInto(q('code')!, '12345678');
    await click(q('verify'));
    await flush();
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'a@b.it', token: '12345678', type: 'email' });
    expect(refresh).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('moves to redirectTo when it is a different page', async () => {
    await sendEmail('/listing/abc?x=1');
    await typeInto(q('code')!, '12345678');
    await click(q('verify'));
    await flush();
    expect(replace).toHaveBeenCalledWith('/listing/abc?x=1');
  });

  it('keeps the Google button working', async () => {
    await render(<AuthPromptForm redirectTo="/" />);
    const google = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes(messages.auth.googleSignIn))!;
    await click(google);
    expect(signIn).toHaveBeenCalledWith('google');
  });
});
