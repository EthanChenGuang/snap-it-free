import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
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
const execCommand = vi.fn();
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
  execCommand.mockReset();
  execCommand.mockReturnValue(true);
  document.execCommand = execCommand;
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

  it('copies synchronously inside the dialog and opens the page in the same tick', async () => {
    writeText.mockReturnValue(new Promise(() => {}));
    const onOpenChange = await mountSheet();
    await click(document.body.querySelectorAll('input[type="radio"]')[1]);
    let copiedText = '';
    let insideDialog = false;
    execCommand.mockImplementation(() => {
      const area = document.activeElement as HTMLTextAreaElement;
      copiedText = area.value;
      insideDialog = Boolean(area.closest('[role="dialog"]'));
      return true;
    });
    const button = byText(copy.primary)!;
    act(() => {
      button.click();
    });
    // No flush: the popup must open in the tap, and the async clipboard is not needed.
    expect(copiedText).toBe(CONTACT_TEMPLATES[1].it);
    expect(insideDialog).toBe(true);
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(writeText).not.toHaveBeenCalled();
    // The sheet stays open: the user is told what to do next, and the helper textarea is gone.
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.body.querySelectorAll('textarea')).toHaveLength(2); // the two (hidden) Translate fields only
    expect(document.body.querySelector('[data-testid="contact-sent"]')?.textContent).toContain(copy.sentNext);
  });

  it('after a send, the next step is a button that opens Translate; picking another template clears it', async () => {
    await mountSheet();
    await click(byText(copy.primary));
    const status = () => document.body.querySelector('[data-testid="contact-sent"]')!;
    expect(status().getAttribute('role')).toBe('status');
    await click(byText(copy.goTranslate));
    expect(byText(copy.tabTranslate, '[role="tab"]')!.getAttribute('aria-selected')).toBe('true');
    await click(byText(copy.tabSend, '[role="tab"]'));
    expect(status().textContent).toContain(copy.sentNext);
    await click(document.body.querySelectorAll('input[type="radio"]')[1]);
    expect(status().textContent).toBe('');
  });

  it('shows the Italian text inside the selected row only, with no separate preview card', async () => {
    await mountSheet();
    const rows = () => [...document.body.querySelectorAll('input[type="radio"]')].map((r) => r.closest('div')!);
    expect(document.body.querySelectorAll('[data-testid="contact-italian-preview"]')).toHaveLength(1);
    expect(rows()[0].querySelector('[data-testid="contact-italian-preview"]')).not.toBeNull();
    await click(document.body.querySelectorAll('input[type="radio"]')[2]);
    expect(rows()[0].querySelector('[data-testid="contact-italian-preview"]')).toBeNull();
    expect(rows()[2].querySelector('[data-testid="contact-italian-preview"]')?.textContent).toBe(CONTACT_TEMPLATES[2].it);
    expect(document.body.textContent).not.toContain(copy.italianLabel + ' ' ); // no card heading
  });

  it('restores focus to the pressed button after copying (the sheet stays open)', async () => {
    await mountSheet();
    const button = byText(copy.primary)!;
    await act(async () => {
      button.focus();
      button.click();
    });
    expect(document.activeElement).toBe(button);
  });

  it('"Go to Translate" focuses the Translate tab and scrolls the shared container to the top', async () => {
    await mountSheet();
    await click(byText(copy.primary));
    const scroller = document.body.querySelector<HTMLElement>('[data-testid="contact-scroll"]')!;
    scroller.scrollTop = 120;
    await click(byText(copy.goTranslate));
    expect(document.activeElement).toBe(byText(copy.tabTranslate, '[role="tab"]'));
    expect(scroller.scrollTop).toBe(0);
  });

  it('has no unnamed button (the drawer grabber is decorative)', async () => {
    await mountSheet();
    const unnamed = [...document.body.querySelectorAll<HTMLElement>('[role="dialog"] button')].filter(
      (el) => !el.getAttribute('aria-label') && !labelOf(el),
    );
    expect(unnamed).toHaveLength(0);
  });

  it('moves between tabs with the arrow keys and keeps only the selected tab in the tab order', async () => {
    await mountSheet();
    const tabs = () => [...document.body.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1]);
    await act(async () => {
      tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(document.activeElement).toBe(tabs()[1]);
    await act(async () => {
      tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
  });

  it('falls back to the async clipboard; the next-step notice only after it succeeds', async () => {
    execCommand.mockReturnValue(false);
    let resolve!: (v?: unknown) => void;
    writeText.mockReturnValue(new Promise((r) => (resolve = r)));
    await mountSheet();
    act(() => {
      byText(copy.primary)!.click();
    });
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(writeText).toHaveBeenCalledWith(CONTACT_TEMPLATES[0].it);
    const notice = () => document.body.querySelector('[data-testid="contact-sent"]')!.textContent;
    expect(notice()).toBe('');
    await act(async () => resolve());
    expect(notice()).toContain(copy.sentNext);
    expect(toast).not.toHaveBeenCalled(); // the in-sheet notice replaces the toast
  });

  it('keeps the sheet open with a hint when every copy path fails', async () => {
    execCommand.mockReturnValue(false);
    writeText.mockRejectedValue(new Error('denied'));
    const onOpenChange = await mountSheet();
    await click(byText(copy.primary));
    await flush();
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(document.body.textContent).toContain(copy.copyFailedHint);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('returns to the send tab when the sheet closes', async () => {
    const onOpenChange = await mountSheet();
    await click(byText(copy.tabTranslate, '[role="tab"]'));
    expect(document.body.querySelector('textarea')).not.toBeNull();
    await click(document.body.querySelector(`button[aria-label="${copy.close}"]`));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await click(byText(copy.tabSend, '[role="tab"]'));
    expect(preview()).toBe(CONTACT_TEMPLATES[0].it);
    expect(byText(copy.tabSend, '[role="tab"]')!.getAttribute('aria-selected')).toBe('true');
  });
});

describe('ContactAssistantSheet focus', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
          open
        </button>
        <ContactAssistantSheet open={open} onOpenChange={setOpen} listing={listing} />
      </>
    );
  }

  it('moves focus into the sheet on open and back to the trigger on close', async () => {
    await render(<Harness />);
    await flush();
    const trigger = document.body.querySelector<HTMLElement>('[data-testid="trigger"]')!;
    await act(async () => {
      trigger.focus();
      trigger.click();
    });
    await flush();
    const dialog = document.body.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    await click(document.body.querySelector(`button[aria-label="${copy.close}"]`));
    await flush();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('ContactAssistantSheet translate tab', () => {
  async function openTranslate() {
    await mountSheet();
    await click(byText(copy.tabTranslate, '[role="tab"]'));
  }

  it('posts the pasted reply and renders the result', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        meaning: 'Yes, come over',
        replies: [
          { italian: 'Perfetto, arrivo!', meaning: 'Great, coming!' },
          { italian: 'Mi dispiace, non riesco.', meaning: 'Sorry, I cannot.' },
          { italian: 'A che ora va bene?', meaning: 'What time suits you?' },
        ],
      }),
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

    expect(document.body.textContent).toContain(copy.pickReply);
    expect(document.body.textContent).toContain('Sorry, I cannot.');
    const buttons = document.body.querySelectorAll(`button[aria-label^="${copy.copy}"]`);
    expect(buttons).toHaveLength(3);

    let copied = '';
    execCommand.mockImplementation(() => {
      copied = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });
    await click(buttons[0]);
    expect(copied).toBe('Perfetto, arrivo!');
    await click(buttons[2]);
    expect(copied).toBe('A che ora va bene?');
  });

  it('renders a single alternative with one copy button', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { meaning: 'Hello', replies: [{ italian: 'Ciao!', meaning: 'Hi!' }] })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, 'Salve');
    await click(byText(copy.translate));
    await flush();
    expect(document.body.querySelectorAll(`button[aria-label^="${copy.copy}"]`)).toHaveLength(1);
  });

  it('tells the user when the composed text could not be understood (not "unavailable")', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { italian: '', unclear: true })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[1] as HTMLTextAreaElement, 'asdfghjkl');
    await click(byText(copy.toItalian));
    await flush();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(copy.composeUnclear);
    expect(document.body.querySelector(`button[aria-label^="${copy.copy}"]`)).toBeNull();
  });

  it('hides a result as soon as the text is edited (replies cannot be copied against the wrong message)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { meaning: 'Yes', replies: [{ italian: 'Ok', meaning: 'Ok!' }] })));
    await openTranslate();
    const field = () => document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement;
    await typeInto(field(), 'Ciao');
    await click(byText(copy.translate));
    await flush();
    expect(document.body.textContent).toContain('Ok!');
    expect(document.body.textContent).toContain(copy.aiNote);
    await typeInto(field(), 'Ciao, domani?');
    expect(document.body.textContent).not.toContain('Ok!');
    expect(document.body.querySelector(`button[aria-label^="${copy.copy}"]`)).toBeNull();
    await typeInto(field(), 'Ciao');
    expect(document.body.textContent).toContain('Ok!'); // same text again: the result belongs to it
  });

  it('ignores a response that arrives after the text was edited, and a superseded request', async () => {
    const pending: Array<(r: Response) => void> = [];
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))));
    await openTranslate();
    const field = () => document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement;
    await typeInto(field(), 'primo');
    await click(byText(copy.translate));
    await typeInto(field(), 'secondo'); // edit while in flight
    expect(byText(copy.translate)).not.toBeNull(); // not stuck on "translating"
    await click(byText(copy.translate));
    await act(async () => pending[0](jsonResponse(200, { meaning: 'FIRST', replies: [{ italian: 'a', meaning: 'a' }] })));
    expect(document.body.textContent).not.toContain('FIRST');
    await act(async () => pending[1](jsonResponse(200, { meaning: 'SECOND', replies: [{ italian: 'b', meaning: 'b' }] })));
    expect(document.body.textContent).toContain('SECOND');
    // an old response for text that is no longer in the field is never shown
    await typeInto(field(), 'terzo');
    expect(document.body.textContent).not.toContain('SECOND');
  });

  it('does the same for the composed text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { italian: 'Ciao ciao', unclear: false })));
    await openTranslate();
    const field = () => document.body.querySelectorAll('textarea')[1] as HTMLTextAreaElement;
    await typeInto(field(), 'hello');
    await click(byText(copy.toItalian));
    await flush();
    expect(document.body.textContent).toContain('Ciao ciao');
    expect(document.body.textContent).toContain(copy.aiNote);
    await typeInto(field(), 'hello there');
    expect(document.body.textContent).not.toContain('Ciao ciao');
  });

  it('explains where the seller reply is found', async () => {
    await openTranslate();
    expect(document.body.textContent).toContain(copy.replyHint);
  });

  it('counter: neutral n/1000 when typed, "rest was cut" only after an over-long paste; wrapper always mounted', async () => {
    await openTranslate();
    const field = () => document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement;
    const status = () => field().nextElementSibling as HTMLElement;
    expect(status().getAttribute('role')).toBe('status');
    expect(status().textContent).toBe('');
    await typeInto(field(), 'a'.repeat(1000));
    expect(status().textContent).toBe('1000/1000');
    expect(document.body.textContent).not.toContain(copy.limitReached);
    await typeInto(field(), '');
    await act(async () => {
      const event = new Event('paste', { bubbles: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'b'.repeat(1500) } });
      field().dispatchEvent(event);
    });
    await typeInto(field(), 'b'.repeat(1000)); // what the browser keeps
    expect(status().textContent).toBe(copy.limitReached);
  });

  it('keeps typed text when switching to Send and back, and tells the user at the 1000-character limit', async () => {
    await openTranslate();
    const field = () => document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement;
    await typeInto(field(), 'Testo da tenere');
    await click(byText(copy.tabSend, '[role="tab"]'));
    await click(byText(copy.tabTranslate, '[role="tab"]'));
    expect(field().value).toBe('Testo da tenere');
    await typeInto(field(), 'a'.repeat(900));
    expect(document.body.textContent).toContain('900/1000');
  });

  it('announces results in a live region', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { meaning: 'Yes', replies: [{ italian: 'Ok', meaning: 'Ok!' }] })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, 'Ciao');
    await click(byText(copy.translate));
    await flush();
    const live = [...document.body.querySelectorAll('[role="status"]')].map((n) => n.textContent);
    expect(live.some((t) => t?.includes(`${copy.meaning}: Yes`))).toBe(true);
  });

  it('posts a composed message and renders the Italian', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { italian: 'Arrivo tra un’ora.', unclear: false }));
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

  it('shows the subscription message on 403', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { error: 'subscription_required' })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, 'Ciao');
    await click(byText(copy.translate));
    await flush();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(copy.subscriptionRequired);
  });

  it('shows the daily-limit message on 429', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(429, { error: 'daily_limit' })));
    await openTranslate();
    await typeInto(document.body.querySelectorAll('textarea')[0] as HTMLTextAreaElement, 'Ciao');
    await click(byText(copy.translate));
    await flush();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(copy.dailyLimit);
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
