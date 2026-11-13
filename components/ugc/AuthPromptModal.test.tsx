import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, click, flush, render } from '@/components/test/render';
import { AuthPromptModal } from './AuthPromptModal';

const signInWithOtp = vi.hoisted(() => vi.fn());
const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOtp, verifyOtp } }) }));
vi.mock('@/lib/supabase/env', () => ({ getSupabaseEnv: () => ({ url: 'https://x.supabase.co', anonKey: 'anon' }) }));
vi.mock('@/lib/auth/use-oauth-sign-in', () => ({ useOAuthSignIn: () => ({ signIn: vi.fn(), status: 'idle', isBusy: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const q = (id: string) => document.body.querySelector<HTMLInputElement>(`[data-testid="auth-prompt-${id}"]`);

async function typeInto(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  verifyOtp.mockReset().mockResolvedValue({ data: { session: {} }, error: null });
});
afterEach(async () => {
  await cleanup();
});

describe('AuthPromptModal', () => {
  it('closes after a successful code verify', async () => {
    const onOpenChange = vi.fn();
    await render(<AuthPromptModal open onOpenChange={onOpenChange} redirectTo="/" />);
    await typeInto(q('email')!, 'a@b.it');
    await click(q('send'));
    await flush();
    await typeInto(q('code')!, '12345678');
    await click(q('verify'));
    await flush();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
