import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, click, flush, jsonResponse, render } from '@/components/test/render';
import { CONTACT_TEMPLATES } from '@/lib/contact/templates';
import type { ListingRow } from '@/lib/listings/types';
import { getMessages } from '@/messages';
import { ContactAssistantSheet } from './ContactAssistantSheet';

const openExternal = vi.hoisted(() => vi.fn());
vi.mock('@/lib/listings/external-url', () => ({ openExternalListingUrl: openExternal }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/toaster', () => ({ toast }));

const copy = getMessages('en').contactAssistant;
const listing = {
  id: 'l1',
  source: 'subito',
  title: 'Vetrina in vetro',
  photo_url: 'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/aa/aa?rule=gallery-mobile-auto',
  external_url: 'https://www.subito.it/arredamento/vetrina-1.htm',
  city: 'napoli',
  posted_at: '2026-11-10T10:00:00Z',
  expires_at: '2026-12-10T10:00:00Z',
  status: 'active',
} as unknown as ListingRow;

const writeText = vi.fn();
// Icon glyphs are aria-hidden text nodes, so compare the label without them.
const labelOf = (el: HTMLElement) => {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden]').forEach((node) => node.remove());
  return clone.textContent?.trim();
};
const byText = (text: string, selector = 'button:not([role="tab"])') =>
  [...document.body.querySelectorAll<HTMLElement>(selector)].find((el) => labelOf(el) === text) ?? null;
const preview = () => document.body.querySelector('[data-testid="contact-italian-preview"]')?.textContent;

async function typeInto(el: HTMLTextAreaElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function mountSheet(onOpenChange = vi.fn()) {
  await render(<ContactAssistantSheet open onOpenChange={onOpenChange} listing={listing} />);
  await flush();
  return onOpenChange;
}

beforeEach(() => {
  openExternal.mockReset();
  toast.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await cleanup();
});

describe('ContactAssistantSheet send tab', () => {
  it('selects the first template and shows a watermark-free thumbnail', async () => {
    await mountSheet();
    expect(preview()).toBe(CONTACT_TEMPLATES[0].it);
    const radios = document.body.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(CONTACT_TEMPLATES.length);
    expect(radios[0].checked).toBe(true);
    const img = document.body.querySelector('img')!;
    expect(img.src).toContain('rule=card-mobile-new-small-2x-auto');
  });

  it('changes the preview when another template is chosen', async () => {
    await mountSheet();
    await click(document.body.querySelectorAll('input[type="radio"]')[2]);
    expect(preview()).toBe(CONTACT_TEMPLATES[2].it);
  });

  it('copies the selected text and opens the seller page', async () => {
    const onOpenChange = await mountSheet();
    await click(document.body.querySelectorAll('input[type="radio"]')[1]);
    await click(byText(copy.primary));
    await flush();
    expect(writeText).toHaveBeenCalledWith(CONTACT_TEMPLATES[1].it);
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(toast).toHaveBeenCalledWith(copy.copiedToast);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('still opens the page and shows a hint when copying fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    document.execCommand = vi.fn(() => false);
    const onOpenChange = await mountSheet();
    await click(byText(copy.primary));
    await flush();
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(document.body.textContent).toContain(copy.copyFailedHint);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('ContactAssistantSheet translate tab', () => {
  async function openTranslate() {
    await mountSheet();
    await click(byText(copy.tabTranslate, '[role="tab"]'));
  }

  it('posts the pasted reply and renders the result', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { meaning: 'Yes, come over', suggestedReply: 'Perfetto, arrivo!', suggestedReplyMeaning: 'Great, coming!' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, '  Sì, passa pure  ');
    await click(byText(copy.translate));
    await flush();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/contact/translate');
    expect(JSON.parse(init.body as string)).toEqual({ mode: 'reply', text: 'Sì, passa pure', language: 'en' });
    expect(document.body.textContent).toContain('Yes, come over');
    expect(document.body.textContent).toContain('Perfetto, arrivo!');

    await click(document.body.querySelector(`button[aria-label^="${copy.copy}"]`));
    expect(writeText).toHaveBeenCalledWith('Perfetto, arrivo!');
  });

  it('posts a composed message and renders the Italian', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { italian: 'Arrivo tra un’ora.' }));
    vi.stubGlobal('fetch', fetchMock);
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[1] as HTMLTextAreaElement, 'I arrive in an hour');
    await click(byText(copy.toItalian));
    await flush();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ mode: 'compose', text: 'I arrive in an hour', language: 'en' });
    expect(document.body.textContent).toContain('Arrivo tra un’ora.');
  });

  it('shows an error when translation fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(502, { error: 'translation_failed' })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, 'Ciao');
    await click(byText(copy.translate));
    await flush();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(copy.unavailable);
  });

  it('asks to sign in again on 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: 'Unauthorized' })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, 'Ciao');
    await click(byText(copy.translate));
    await flush();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(copy.signInAgain);
  });
});
