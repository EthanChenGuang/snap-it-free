'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from '@/components/ui/toaster';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import { CONTACT_TEMPLATES, type ContactTemplateId } from '@/lib/contact/templates';
import type { ComposeResult, ReplyResult, TranslateMode } from '@/lib/contact/translate';
import { listingConsumerCityLabel } from '@/lib/listings/feed-search';
import { openExternalListingUrl } from '@/lib/listings/external-url';
import { normalizeSubitoThumbnailUrl } from '@/lib/listings/subito-photo-url';
import type { ListingRow } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

type ContactAssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ListingRow;
};

type Tab = 'send' | 'translate';

type TranslateState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; result: T };

/** Default Button hover is bg-primary-container with on-primary text, unreadable in dark mode (1.9:1). */
const PRIMARY_HOVER = 'hover:bg-primary hover:opacity-90';
const INPUT_LIMIT = 1000;

const FIELD_CLASS =
  'w-full resize-none rounded border border-outline-variant bg-surface-container-lowest p-space-sm text-base text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-on-surface focus:ring-1 focus:ring-outline';

/**
 * Synchronous copy, run inside the tap. The textarea goes inside the drawer so the focus trap keeps
 * its selection; outside it, select() is lost while execCommand still reports success.
 */
function copySync(text: string, container: Element): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.opacity = '0';
  container.append(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

function containerOf(target: Element): Element {
  return target.closest('[role="dialog"]') ?? document.body;
}

/**
 * Copies inside the tap. Returns true when the synchronous copy worked, otherwise starts the async
 * clipboard write and returns its promise (true/false once it settles).
 */
function copyFromTap(text: string, target: Element): true | Promise<boolean> {
  if (copySync(text, containerOf(target))) return true;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }
  return Promise.resolve(false);
}

function useTranslate<T>(mode: TranslateMode) {
  const { language, messages } = useMessages();
  const [state, setState] = useState<TranslateState<T>>({ status: 'idle' });

  const run = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState({ status: 'loading' });
    try {
      const response = await fetch('/api/contact/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, text: trimmed, language: language === 'en' ? 'en' : 'zh' }),
      });
      if (response.status === 401) {
        setState({ status: 'error', message: messages.contactAssistant.signInAgain });
        return;
      }
      if (response.status === 429) {
        setState({ status: 'error', message: messages.contactAssistant.dailyLimit });
        return;
      }
      if (response.status === 403) {
        setState({ status: 'error', message: messages.contactAssistant.subscriptionRequired });
        return;
      }
      if (!response.ok) {
        setState({ status: 'error', message: messages.contactAssistant.unavailable });
        return;
      }
      setState({ status: 'done', result: (await response.json()) as T });
    } catch {
      setState({ status: 'error', message: messages.contactAssistant.unavailable });
    }
  };

  return { state, run };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { messages } = useMessages();
  const [copied, setCopied] = useState(false);

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const result = copyFromTap(text, event.currentTarget);
    if (result === true) markCopied();
    else void result.then((ok) => ok && markCopied());
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 gap-space-xs"
        onClick={handleClick}
        aria-label={label}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          {copied ? 'check' : 'content_copy'}
        </span>
        {copied ? messages.contactAssistant.copied : messages.contactAssistant.copy}
      </Button>
      {/* The button's accessible name is fixed, so the result is announced here. */}
      <span role="status" className="sr-only">
        {copied ? messages.contactAssistant.copied : ''}
      </span>
    </>
  );
}

function ItalianCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
      <p className="flex items-center gap-space-xs text-label-md font-semibold text-on-surface">
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          language
        </span>
        {label}
      </p>
      <p
        lang="it"
        data-testid="contact-italian-preview"
        className="mt-space-sm select-text break-words rounded [user-select:text] bg-surface-container-lowest p-space-sm text-body-md italic text-on-surface"
      >
        {text}
      </p>
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="text-label-sm text-error" role="alert">
      {message}
    </p>
  );
}

function CharCount({ length }: { length: number }) {
  const { messages } = useMessages();
  if (length < INPUT_LIMIT - 200) return null;
  const full = length >= INPUT_LIMIT;
  return (
    <p
      role={full ? 'status' : undefined}
      className={cn('text-label-sm', full ? 'text-error' : 'text-right text-on-surface-variant')}
    >
      {full ? messages.contactAssistant.limitReached : `${length}/${INPUT_LIMIT}`}
    </p>
  );
}

type SendState = 'idle' | 'sent' | 'copyFailed';

function SendBody({
  selected,
  onSelect,
}: {
  selected: ContactTemplateId;
  onSelect: (id: ContactTemplateId) => void;
}) {
  const { messages } = useMessages();
  const copy = messages.contactAssistant;
  const groupId = useId();
  const template = CONTACT_TEMPLATES.find((item) => item.id === selected) ?? CONTACT_TEMPLATES[0];
  const steps = [copy.step1, copy.step2, copy.step3];

  return (
    <div className="flex flex-col gap-space-md">
      <div role="radiogroup" aria-labelledby={`${groupId}-title`} className="flex flex-col gap-space-sm">
        <p id={`${groupId}-title`} className="text-label-md text-on-surface-variant">
          {copy.pickTitle}
        </p>
        {CONTACT_TEMPLATES.map((item) => (
          <label
            key={item.id}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-space-sm rounded-lg border px-space-md py-space-xs text-body-md font-medium text-on-surface',
              selected === item.id
                ? 'border-transparent bg-surface-container'
                : 'border-outline-variant bg-surface-container-lowest',
            )}
          >
            <input
              type="radio"
              name={`${groupId}-template`}
              value={item.id}
              checked={selected === item.id}
              onChange={() => onSelect(item.id)}
              className="size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0">{copy.templates[item.id]}</span>
          </label>
        ))}
      </div>

      <ItalianCard label={copy.italianLabel} text={template.it} />

      <ol className="flex flex-col gap-space-sm">
        {steps.map((step, index) => (
          <li key={step} className="flex min-w-0 items-center gap-space-sm">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-container text-label-sm font-semibold text-on-secondary-container"
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="min-w-0 text-label-md font-semibold text-on-surface">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SendFooter({
  listing,
  selected,
  state,
  onState,
  onGoTranslate,
}: {
  listing: ListingRow;
  selected: ContactTemplateId;
  state: SendState;
  onState: (state: SendState) => void;
  onGoTranslate: () => void;
}) {
  const { messages } = useMessages();
  const copy = messages.contactAssistant;
  const template = CONTACT_TEMPLATES.find((item) => item.id === selected) ?? CONTACT_TEMPLATES[0];

  const handlePrimary = (event: React.MouseEvent<HTMLButtonElement>) => {
    const copied = copyFromTap(template.it, event.currentTarget);
    // Same tick as the tap: a popup opened after an await is blocked.
    openExternalListingUrl(listing.external_url);
    const finish = (ok: boolean) => {
      onState(ok ? 'sent' : 'copyFailed');
      if (ok) toast(copy.copiedToast);
    };
    if (copied === true) finish(true);
    else void copied.then(finish);
  };

  return (
    <div
      data-testid="contact-footer"
      className="shrink-0 border-t border-outline-variant bg-surface px-gutter py-space-md pb-[max(env(safe-area-inset-bottom,0px),var(--spacing-space-md))]"
    >
      {/* Always mounted so the message is announced when it appears. */}
      <div role="status" data-testid="contact-sent">
        {state === 'sent' && (
          <div className="mb-space-sm flex flex-col gap-space-sm rounded-lg bg-surface-container p-space-sm">
            <p className="text-label-sm text-on-surface">{copy.sentNext}</p>
            <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={onGoTranslate}>
              {copy.goTranslate}
            </Button>
          </div>
        )}
      </div>
      {state === 'copyFailed' && (
        <p className="mb-space-sm text-label-sm text-error" role="alert">
          {copy.copyFailedHint}
        </p>
      )}
      <Button
        type="button"
        data-testid="contact-primary"
        className={cn('flex min-h-12 w-full items-center justify-center gap-space-sm text-label-md font-semibold', PRIMARY_HOVER)}
        onClick={handlePrimary}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          content_copy
        </span>
        {copy.primary}
      </Button>
      <p className="mt-space-sm text-center text-label-sm text-on-surface-variant">{copy.firstTimeNote}</p>
    </div>
  );
}

function TranslateTab() {
  const { messages } = useMessages();
  const copy = messages.contactAssistant;
  const replyId = useId();
  const composeId = useId();
  const [replyText, setReplyText] = useState('');
  const [composeText, setComposeText] = useState('');
  const reply = useTranslate<ReplyResult>('reply');
  const compose = useTranslate<ComposeResult>('compose');

  return (
    <div className="flex flex-col gap-space-lg pb-space-md">
      <section className="flex flex-col gap-space-sm">
        <label htmlFor={replyId} className="text-label-md font-medium text-on-surface-variant">
          {copy.replyLabel}
        </label>
        <textarea
          id={replyId}
          lang="it"
          rows={4}
          maxLength={INPUT_LIMIT}
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          placeholder={copy.replyPlaceholder}
          className={FIELD_CLASS}
        />
        <Button
          type="button"
          className={cn('min-h-11 w-full', PRIMARY_HOVER)}
          disabled={!replyText.trim() || reply.state.status === 'loading'}
          onClick={() => void reply.run(replyText)}
        >
          {reply.state.status === 'loading' ? copy.translating : copy.translate}
        </Button>
        <CharCount length={replyText.length} />
        <span role="status" className="sr-only">
          {reply.state.status === 'loading' ? copy.translating : ''}
          {reply.state.status === 'done' ? `${copy.meaning}: ${reply.state.result.meaning}` : ''}
        </span>
        {reply.state.status === 'error' && <ErrorLine message={reply.state.message} />}
        {reply.state.status === 'done' && (
          <div className="flex flex-col gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
            <div>
              <p className="text-label-sm font-semibold text-on-surface-variant">{copy.meaning}</p>
              <p className="mt-space-xs break-words text-body-md text-on-surface">{reply.state.result.meaning}</p>
            </div>
            <p className="text-label-md font-semibold text-on-surface">{copy.pickReply}</p>
            <ul className="flex flex-col gap-space-sm">
              {reply.state.result.replies.map((option, index) => (
                <li
                  key={`${index}-${option.italian}`}
                  className="flex flex-col gap-space-xs rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm"
                >
                  <p lang="it" className="select-text break-words text-body-md italic text-on-surface">
                    {option.italian}
                  </p>
                  <p className="break-words text-label-md text-on-surface-variant">{option.meaning}</p>
                  <CopyButton text={option.italian} label={`${copy.copy}: ${option.italian}`} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-space-sm border-t border-outline-variant pt-space-lg">
        <label htmlFor={composeId} className="text-label-md font-medium text-on-surface-variant">
          {copy.composeLabel}
        </label>
        <textarea
          id={composeId}
          rows={3}
          maxLength={INPUT_LIMIT}
          value={composeText}
          onChange={(event) => setComposeText(event.target.value)}
          placeholder={copy.composePlaceholder}
          className={FIELD_CLASS}
        />
        <Button
          type="button"
          className={cn('min-h-11 w-full', PRIMARY_HOVER)}
          disabled={!composeText.trim() || compose.state.status === 'loading'}
          onClick={() => void compose.run(composeText)}
        >
          {compose.state.status === 'loading' ? copy.translating : copy.toItalian}
        </Button>
        <CharCount length={composeText.length} />
        <span role="status" className="sr-only">
          {compose.state.status === 'loading' ? copy.translating : ''}
          {compose.state.status === 'done' && !compose.state.result.unclear ? compose.state.result.italian : ''}
        </span>
        {compose.state.status === 'error' && <ErrorLine message={compose.state.message} />}
        {compose.state.status === 'done' && compose.state.result.unclear && <ErrorLine message={copy.composeUnclear} />}
        {compose.state.status === 'done' && !compose.state.result.unclear && (
          <div className="flex flex-col gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
            <p lang="it" className="select-text break-words text-body-md italic text-on-surface">
              {compose.state.result.italian}
            </p>
            <CopyButton text={compose.state.result.italian} label={`${copy.copy}: ${copy.italianLabel}`} />
          </div>
        )}
      </section>
    </div>
  );
}

const TABS: { id: Tab; icon: string }[] = [
  { id: 'send', icon: 'send' },
  { id: 'translate', icon: 'translate' },
];

export function ContactAssistantSheet({ open, onOpenChange, listing }: ContactAssistantSheetProps) {
  const { language, messages } = useMessages();
  const copy = messages.contactAssistant;
  const [tab, setTab] = useState<Tab>('send');
  const [selected, setSelected] = useState<ContactTemplateId>(CONTACT_TEMPLATES[0].id);
  const [sendState, setSendState] = useState<SendState>('idle');
  const tabsId = useId();
  // Focus goes back to the button that opened the sheet (vaul/Radix would otherwise drop it on <body>).
  const returnFocusTo = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) returnFocusTo.current = document.activeElement as HTMLElement | null;
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTab('send');
      setSelected(CONTACT_TEMPLATES[0].id);
      setSendState('idle');
    }
    onOpenChange(next);
  };

  const title = resolveListingTitle(listing, language);
  const city = listingConsumerCityLabel(listing, consumerCityLabelsFromMessages(messages));
  const tabLabels: Record<Tab, string> = { send: copy.tabSend, translate: copy.tabTranslate };

  // ARIA tabs pattern: arrows/Home/End move between tabs; only the selected tab is in the tab order.
  const handleTabKeyDown = (event: React.KeyboardEvent) => {
    const index = TABS.findIndex((item) => item.id === tab);
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`${tabsId}-${TABS[next].id}`)?.focus();
  };

  // autoFocus: vaul otherwise leaves focus on the (now aria-hidden) button behind the sheet.
  return (
    <Drawer open={open} onOpenChange={handleOpenChange} autoFocus>
      <DrawerContent
        className="bottom-0 h-[90dvh] max-h-[90dvh] pb-0"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusTo.current?.focus();
        }}
      >
        <DrawerHeader className="shrink-0 flex-row items-center justify-between border-b border-outline-variant pb-space-sm">
          <DrawerTitle className="text-h3 font-semibold">{copy.title}</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label={copy.close}
              className="flex size-11 items-center justify-center rounded-full text-on-surface"
            >
              <span className="material-symbols-outlined" aria-hidden>
                close
              </span>
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Everything between the header and the pinned footer scrolls, so short screens never collapse it. */}
          <div
            data-testid="contact-scroll"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-space-md"
          >
            <div className="flex items-center gap-space-md rounded-lg border border-outline-variant bg-surface-container-low p-space-sm">
              {listing.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- hot-linked CDN thumbnail, watermark-free preset
                <img
                  src={normalizeSubitoThumbnailUrl(listing.photo_url)}
                  alt=""
                  className="size-12 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="size-12 shrink-0 rounded bg-surface-container-high" />
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 break-words text-body-md font-semibold text-on-surface">{title}</p>
                <p className="mt-space-xs text-label-sm text-on-surface-variant">
                  {[city, messages.listing.free].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div
              role="tablist"
              aria-label={copy.tabsLabel}
              onKeyDown={handleTabKeyDown}
              className="mt-space-md flex gap-space-xs rounded-lg bg-surface-container p-space-xs"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`${tabsId}-panel-${item.id}`}
                  tabIndex={tab === item.id ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'flex min-h-11 flex-1 items-center justify-center gap-space-xs rounded px-space-sm text-label-md font-semibold',
                    tab === item.id
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                      : 'text-on-surface-variant',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden>
                    {item.icon}
                  </span>
                  {tabLabels[item.id]}
                </button>
              ))}
            </div>

            {/* Both panels stay mounted (hidden) so text typed on Translate survives a look at Send. */}
            <div
              role="tabpanel"
              id={`${tabsId}-panel-send`}
              aria-labelledby={`${tabsId}-send`}
              hidden={tab !== 'send'}
              className="mt-space-md"
            >
              <SendBody
                selected={selected}
                onSelect={(id) => {
                  setSelected(id);
                  setSendState('idle');
                }}
              />
            </div>
            <div
              role="tabpanel"
              id={`${tabsId}-panel-translate`}
              aria-labelledby={`${tabsId}-translate`}
              hidden={tab !== 'translate'}
              className="mt-space-md"
            >
              <TranslateTab />
            </div>
          </div>

          {tab === 'send' && (
            <SendFooter
              listing={listing}
              selected={selected}
              state={sendState}
              onState={setSendState}
              onGoTranslate={() => setTab('translate')}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
