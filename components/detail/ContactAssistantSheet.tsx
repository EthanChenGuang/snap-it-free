'use client';

import { useId, useState } from 'react';
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

const FIELD_CLASS =
  'w-full resize-none rounded border border-outline-variant bg-surface-container-lowest p-space-sm text-base text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-on-surface focus:ring-1 focus:ring-outline';

function fallbackCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Starts the copy synchronously (must run inside the tap, or iOS refuses); resolves to whether it worked. */
function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => fallbackCopy(text),
    );
  }
  return Promise.resolve(fallbackCopy(text));
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

  const handleClick = () => {
    void copyToClipboard(text).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
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
        className="mt-space-sm select-text break-words rounded bg-surface-container-lowest p-space-sm text-body-md italic text-on-surface"
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

function SendTab({ listing, onDone }: { listing: ListingRow; onDone: () => void }) {
  const { messages } = useMessages();
  const copy = messages.contactAssistant;
  const groupId = useId();
  const [selected, setSelected] = useState<ContactTemplateId>(CONTACT_TEMPLATES[0].id);
  const [copyFailed, setCopyFailed] = useState(false);
  const template = CONTACT_TEMPLATES.find((item) => item.id === selected) ?? CONTACT_TEMPLATES[0];

  const handlePrimary = () => {
    const pending = copyToClipboard(template.it);
    openExternalListingUrl(listing.external_url);
    void pending.then((ok) => {
      if (ok) {
        setCopyFailed(false);
        toast(copy.copiedToast);
        onDone();
      } else {
        setCopyFailed(true);
      }
    });
  };

  const steps = [copy.step1, copy.step2, copy.step3];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-space-md">
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
                  onChange={() => setSelected(item.id)}
                  className="size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0">{copy.templates[item.id]}</span>
              </label>
            ))}
          </div>

          <ItalianCard label={copy.italianLabel} text={template.it} />
        </div>
      </div>

      <div className="shrink-0 border-t border-outline-variant bg-surface px-gutter py-space-md pb-[max(env(safe-area-inset-bottom,0px),var(--spacing-space-md))]">
        <ol className="mb-space-md flex items-start justify-between gap-space-xs">
          {steps.map((step, index) => (
            <li key={step} className="flex min-w-0 flex-1 items-start gap-space-xs">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary-container text-label-sm font-semibold text-on-secondary-container"
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="min-w-0 text-label-sm font-semibold text-on-surface">{step}</span>
              {index < steps.length - 1 && (
                <span
                  className="material-symbols-outlined ml-auto shrink-0 text-[16px] text-on-surface-variant"
                  aria-hidden
                >
                  arrow_forward
                </span>
              )}
            </li>
          ))}
        </ol>
        {copyFailed && <p className="mb-space-sm text-label-sm text-error" role="alert">{copy.copyFailedHint}</p>}
        <Button
          type="button"
          className="flex min-h-12 w-full items-center justify-center gap-space-sm text-label-md font-semibold"
          onClick={handlePrimary}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            content_copy
          </span>
          {copy.primary}
        </Button>
        <p className="mt-space-sm text-center text-label-sm text-on-surface-variant">{copy.firstTimeNote}</p>
      </div>
    </>
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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter py-space-md pb-[max(env(safe-area-inset-bottom,0px),var(--spacing-space-lg))]">
      <div className="flex flex-col gap-space-lg">
        <section className="flex flex-col gap-space-sm">
          <label htmlFor={replyId} className="text-label-md font-medium text-on-surface-variant">
            {copy.replyLabel}
          </label>
          <textarea
            id={replyId}
            lang="it"
            rows={4}
            maxLength={1000}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder={copy.replyPlaceholder}
            className={FIELD_CLASS}
          />
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={!replyText.trim() || reply.state.status === 'loading'}
            onClick={() => void reply.run(replyText)}
          >
            {reply.state.status === 'loading' ? copy.translating : copy.translate}
          </Button>
          {reply.state.status === 'error' && <ErrorLine message={reply.state.message} />}
          {reply.state.status === 'done' && (
            <div className="flex flex-col gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
              <div>
                <p className="text-label-sm font-semibold text-on-surface-variant">{copy.meaning}</p>
                <p className="mt-space-xs break-words text-body-md text-on-surface">{reply.state.result.meaning}</p>
              </div>
              <div>
                <p className="text-label-sm font-semibold text-on-surface-variant">{copy.suggestedReply}</p>
                <p lang="it" className="mt-space-xs select-text break-words text-body-md italic text-on-surface">
                  {reply.state.result.suggestedReply}
                </p>
                <p className="mt-space-xs break-words text-label-md text-on-surface-variant">
                  {reply.state.result.suggestedReplyMeaning}
                </p>
              </div>
              <CopyButton text={reply.state.result.suggestedReply} label={`${copy.copy}: ${copy.suggestedReply}`} />
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
            maxLength={1000}
            value={composeText}
            onChange={(event) => setComposeText(event.target.value)}
            placeholder={copy.composePlaceholder}
            className={FIELD_CLASS}
          />
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={!composeText.trim() || compose.state.status === 'loading'}
            onClick={() => void compose.run(composeText)}
          >
            {compose.state.status === 'loading' ? copy.translating : copy.toItalian}
          </Button>
          {compose.state.status === 'error' && <ErrorLine message={compose.state.message} />}
          {compose.state.status === 'done' && (
            <div className="flex flex-col gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low p-space-md">
              <p lang="it" className="select-text break-words text-body-md italic text-on-surface">
                {compose.state.result.italian}
              </p>
              <CopyButton text={compose.state.result.italian} label={`${copy.copy}: ${copy.italianLabel}`} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ContactAssistantSheet({ open, onOpenChange, listing }: ContactAssistantSheetProps) {
  const { language, messages } = useMessages();
  const copy = messages.contactAssistant;
  const [tab, setTab] = useState<Tab>('send');
  const tabsId = useId();

  const title = resolveListingTitle(listing, language);
  const city = listingConsumerCityLabel(listing, consumerCityLabelsFromMessages(messages));
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'send', label: copy.tabSend, icon: 'send' },
    { id: 'translate', label: copy.tabTranslate, icon: 'translate' },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bottom-0 h-[90dvh] max-h-[90dvh] pb-0">
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

        <div className="shrink-0 px-gutter pt-space-md">
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
              <p className="line-clamp-2 text-body-md font-semibold text-on-surface">{title}</p>
              <p className="mt-space-xs text-label-sm text-on-surface-variant">
                {[city, messages.listing.free].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label={copy.tabsLabel}
            className="mt-space-md flex gap-space-xs rounded-lg bg-surface-container p-space-xs"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${tabsId}-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`${tabsId}-panel`}
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
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`${tabsId}-panel`}
          aria-labelledby={`${tabsId}-${tab}`}
          className="flex min-h-0 flex-1 flex-col"
        >
          {tab === 'send' ? (
            <SendTab listing={listing} onDone={() => onOpenChange(false)} />
          ) : (
            <TranslateTab />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
