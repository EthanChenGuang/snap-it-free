import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, click, flush, render } from '@/components/test/render';
import { getMessages } from '@/messages';
import { EmailCodeSignIn } from './EmailCodeSignIn';

const signInWithOtp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOtp } }) }));
vi.mock('@/lib/supabase/env', () => ({ getSupabaseEnv: () => ({ url: 'https://x.supabase.co', anonKey: 'anon' }) }));

const copy = getMessages('en').emailCode;
const q = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-testid="email-code-${id}"]`);

async function typeEmail(container: HTMLElement, value: string) {
  const input = q(container, 'email') as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function sendTo(container: HTMLElement, value: string) {
  await typeEmail(container, value);
  await click(q(container, 'send'));
  await flush();
}

beforeEach(() => {
  signInWithOtp.mockReset();
  signInWithOtp.mockResolvedValue({ error: null });
});
afterEach(async () => {
  await cleanup();
});

describe('EmailCodeSignIn resend', () => {
  it('shows the address on its own line and counts down before a resend', async () => {
    const container = await render(<EmailCodeSignIn emailRedirectTo="https://x.test/" onSignedIn={() => {}} />);
    await sendTo(container, 'luciano_chen@hotmail.com');

    expect(q(container, 'sent')?.textContent).toContain('luciano_chen@hotmail.com');
    expect((q(container, 'resend') as HTMLButtonElement).disabled).toBe(true);
    expect(q(container, 'resend')?.textContent).toMatch(/Send again in \d+s/);
  });

  it('"Use another email" then the same address again goes back to the code without a second send', async () => {
    const container = await render(<EmailCodeSignIn emailRedirectTo="https://x.test/" onSignedIn={() => {}} />);
    await sendTo(container, 'luciano_chen@hotmail.com');
    const change = [...container.querySelectorAll('button')].find((b) => b.textContent === copy.changeEmail)!;
    await click(change);
    await sendTo(container, 'luciano_chen@hotmail.com');

    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(q(container, 'sent')).not.toBeNull();
    expect(container.textContent).not.toContain(copy.sendError);
  });

  it('explains Supabase\'s wait instead of a generic failure', async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 429, message: 'For security purposes, you can only request this after 42 seconds.' } });
    const container = await render(<EmailCodeSignIn emailRedirectTo="https://x.test/" onSignedIn={() => {}} />);
    await sendTo(container, 'someone@example.test');

    expect(container.textContent).toContain(copy.waitError(42));
    expect(container.textContent).not.toContain(copy.sendError);
  });
});
