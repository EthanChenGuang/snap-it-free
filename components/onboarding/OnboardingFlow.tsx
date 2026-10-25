'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import { fetchActiveListingsClient } from '@/lib/listings/client-queries';
import { CONSUMER_CITY_FILTER_ORDER, excludeReportedIds } from '@/lib/listings/filters';
import type { ListingRow } from '@/lib/listings/types';
import { markOnboardingCompleted, urlWithoutForceParam } from '@/lib/paywall/gate';
import {
  INITIAL_ONBOARDING_STATE,
  INTRO_STEPS,
  canAdvance,
  introStepIndex,
  onboardingReducer,
  type OnboardingAction,
  type OnboardingState,
} from '@/lib/paywall/onboarding-flow';
import { summarizeCityTeaser } from '@/lib/paywall/teaser';
import { requestPushPermissionAndSubscribe, type PushSubscribeResult } from '@/lib/pwa/usePushSubscribe';
import { readReportedIds } from '@/lib/reports/storage';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { cn } from '@/lib/utils';
import type { Messages } from '@/messages';

type TeaserSource =
  | { status: 'loading' }
  | { status: 'ready'; listings: ListingRow[] }
  | { status: 'error' };

type PushState = { status: 'idle' } | { status: 'pending' } | { status: 'settled'; result: PushSubscribeResult };

const TITLE_ID = 'onboarding-title';


/** Headline with one underlined word; falls back to plain text if the word is absent. */
function EmphasisTitle({ title, emphasis }: { title: string; emphasis: string }) {
  const at = title.indexOf(emphasis);
  if (at < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className="underline decoration-2 underline-offset-[6px]">{emphasis}</span>
      {title.slice(at + emphasis.length)}
    </>
  );
}

function useFocusOnChange(key: string) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [key]);
  return ref;
}

function useTeaserSource(): TeaserSource {
  const [source, setSource] = useState<TeaserSource>({ status: 'loading' });
  useEffect(() => {
    // Without Supabase the client helper returns [], which would read as a false "0 listings".
    if (!getSupabaseEnv()) {
      setSource({ status: 'error' });
      return;
    }
    let cancelled = false;
    fetchActiveListingsClient()
      .then((rows) => {
        if (!cancelled) setSource({ status: 'ready', listings: excludeReportedIds(rows, readReportedIds()) });
      })
      .catch(() => {
        if (!cancelled) setSource({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return source;
}

function pushResultMessage(result: PushSubscribeResult, copy: Messages['onboarding']['alerts']): string {
  if (result.ok) return copy.enabled;
  switch (result.reason) {
    case 'not_logged_in':
      return copy.notLoggedIn;
    case 'ios_not_ready':
      return copy.iosNotReady;
    case 'unsupported':
      return copy.unsupported;
    case 'permission_denied':
      return copy.permissionDenied;
    case 'vapid_missing':
    case 'subscribe_error':
      return copy.failed;
  }
}

function IntroHeader({
  state,
  dispatch,
  messages,
}: {
  state: OnboardingState;
  dispatch: (action: OnboardingAction) => void;
  messages: Messages;
}) {
  const index = introStepIndex(state.screen);
  return (
    <header className="flex h-14 shrink-0 items-center gap-space-md px-space-md">
      <div className="flex w-16 justify-start">
        {index === 0 ? (
          <CompactLocaleChip />
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ type: 'back' })}
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline"
            aria-label={messages.onboarding.back}
          >
            <SymbolIcon name="arrow_back" />
          </button>
        )}
      </div>
      <div className="flex flex-1 items-center gap-space-xs" aria-hidden>
        {INTRO_STEPS.map((step, stepIndex) => (
          <span
            key={step}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              stepIndex <= index ? 'bg-primary' : 'bg-surface-container-high',
            )}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {messages.onboarding.progress(index + 1, INTRO_STEPS.length)}
      </p>
      <div className="flex w-16 justify-end">
        <button
          type="button"
          onClick={() => dispatch({ type: 'skip' })}
          className="h-11 rounded px-space-sm text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline"
        >
          {messages.onboarding.skip}
        </button>
      </div>
    </header>
  );
}

function StepHero({ icon }: { icon: string }) {
  return (
    <div className="mb-space-lg flex h-20 w-20 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest">
      <SymbolIcon name={icon} className="text-[40px] text-on-surface" />
    </div>
  );
}

function StepTitle({ titleRef, title, emphasis }: { titleRef: React.Ref<HTMLHeadingElement>; title: string; emphasis: string }) {
  return (
    <h1
      id={TITLE_ID}
      ref={titleRef}
      tabIndex={-1}
      className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-on-surface outline-none"
    >
      <EmphasisTitle title={title} emphasis={emphasis} />
    </h1>
  );
}

function FeatureRow({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <li className="flex gap-space-md border-t border-outline-variant py-space-md first:border-t-0">
      <SymbolIcon name={icon} className="mt-0.5 text-[24px] text-on-surface" />
      <div>
        <p className="text-label-md text-on-surface">{title}</p>
        {body && <p className="mt-0.5 text-body-md text-on-surface-variant">{body}</p>}
      </div>
    </li>
  );
}

function CityTeaserPanel({
  city,
  source,
  messages,
}: {
  city: ConsumerCityKey;
  source: TeaserSource;
  messages: Messages;
}) {
  const { language } = useMessages();
  const copy = messages.onboarding.city;
  const cityLabel = consumerCityLabelsFromMessages(messages)[city];

  if (source.status === 'loading') {
    return <p className="text-body-md text-on-surface-variant">{copy.teaserLoading}</p>;
  }
  if (source.status === 'error') {
    return <p className="text-body-md text-on-surface-variant">{copy.teaserError}</p>;
  }

  const teaser = summarizeCityTeaser(source.listings, city);
  if (teaser.count === 0) {
    return <p className="text-body-md text-on-surface-variant">{copy.teaserEmpty(cityLabel)}</p>;
  }

  return (
    <div>
      <p className="text-label-md text-on-surface" data-testid="onboarding-teaser-count">
        {copy.teaserCount(teaser.count, cityLabel)}
      </p>
      {teaser.thumbnails.length > 0 && (
        <ul className="mt-space-md grid grid-cols-4 gap-space-sm" aria-label={copy.teaserPhotosLabel}>
          {teaser.thumbnails.map((thumb) => (
            <li
              key={thumb.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-surface-container-high"
            >
              <ListingPhoto
                src={thumb.photoUrl}
                alt={resolveListingTitle(thumb.listing, language)}
                variant="thumbnail"
                sizes="96px"
                priority
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  const { messages } = useMessages();
  const { setCity } = useFeedFilter();
  const { openInstallGuide } = usePwaOnboarding();
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING_STATE);
  const [push, setPush] = useState<PushState>({ status: 'idle' });
  const teaserSource = useTeaserSource();
  const titleRef = useFocusOnChange(state.screen);
  const copy = messages.onboarding;

  useEffect(() => {
    if (state.screen !== 'done') return;
    markOnboardingCompleted(window.localStorage);
    if (state.city) setCity(state.city);
    window.history.replaceState(window.history.state, '', urlWithoutForceParam(window.location.href));
    onFinish();
    const pendingInstallGuide =
      push.status === 'settled' && !push.result.ok && push.result.reason === 'ios_not_ready';
    if (pendingInstallGuide) openInstallGuide();
  }, [state.screen, state.city, setCity, onFinish, openInstallGuide, push]);

  const enablePush = useCallback(async () => {
    setPush({ status: 'pending' });
    const result = await requestPushPermissionAndSubscribe().catch(
      (): PushSubscribeResult => ({ ok: false, reason: 'subscribe_error' }),
    );
    setPush({ status: 'settled', result });
  }, []);

  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, x: 16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -16 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      };

  if (state.screen === 'done') return null;

  const cityLabels = consumerCityLabelsFromMessages(messages);
  const isIntro = state.screen !== 'paywall';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      data-testid="onboarding-overlay"
      data-screen={state.screen}
      className="fixed inset-0 z-[150] flex justify-center bg-background sm:items-center sm:bg-surface-container-low sm:p-space-lg"
    >
      <div className="flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:h-[min(820px,100%)] sm:rounded-lg sm:border sm:border-outline-variant">
        {isIntro ? (
          <>
            <IntroHeader state={state} dispatch={dispatch} messages={messages} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state.screen}
                className="no-scrollbar flex-1 overflow-y-auto px-gutter pt-space-lg pb-space-md"
                {...motionProps}
              >
                {state.screen === 'welcome' && (
                  <>
                    <StepHero icon="redeem" />
                    <StepTitle titleRef={titleRef} title={copy.welcome.title} emphasis={copy.welcome.emphasis} />
                    <p className="mt-space-md text-body-lg text-on-surface-variant">{copy.welcome.body}</p>
                  </>
                )}

                {state.screen === 'how' && (
                  <>
                    <StepHero icon="grid_view" />
                    <StepTitle titleRef={titleRef} title={copy.how.title} emphasis={copy.how.emphasis} />
                    <ul className="mt-space-lg">
                      <FeatureRow icon="view_agenda" title={copy.how.feedTitle} body={copy.how.feedBody} />
                      <FeatureRow icon="map" title={copy.how.mapTitle} body={copy.how.mapBody} />
                      <FeatureRow icon="tune" title={copy.how.filterTitle} body={copy.how.filterBody} />
                    </ul>
                  </>
                )}

                {state.screen === 'city' && (
                  <>
                    <StepTitle titleRef={titleRef} title={copy.city.title} emphasis={copy.city.emphasis} />
                    <p className="mt-space-sm text-body-md text-on-surface-variant">{copy.city.body}</p>
                    <div className="mt-space-lg flex flex-wrap gap-space-sm" role="radiogroup" aria-labelledby={TITLE_ID}>
                      {CONSUMER_CITY_FILTER_ORDER.map((city) => {
                        const active = state.city === city;
                        return (
                          <Button
                            key={city}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            variant={active ? 'chipActive' : 'chip'}
                            className="h-10 rounded-full px-space-md"
                            onClick={() => dispatch({ type: 'selectCity', city })}
                          >
                            {cityLabels[city]}
                          </Button>
                        );
                      })}
                    </div>
                    {state.city && (
                      <section
                        className="mt-space-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-space-md"
                        aria-live="polite"
                        data-testid="onboarding-teaser"
                      >
                        <CityTeaserPanel city={state.city} source={teaserSource} messages={messages} />
                      </section>
                    )}
                  </>
                )}

                {state.screen === 'alerts' && (
                  <>
                    <StepHero icon="notifications_active" />
                    <StepTitle titleRef={titleRef} title={copy.alerts.title} emphasis={copy.alerts.emphasis} />
                    <p className="mt-space-md text-body-lg text-on-surface-variant">{copy.alerts.body}</p>
                    <ul className="mt-space-lg">
                      <FeatureRow icon="sell" title={copy.alerts.pointKeywords} />
                      <FeatureRow icon="bedtime" title={copy.alerts.pointQuiet} />
                    </ul>
                    {push.status === 'settled' && (
                      <p
                        role="status"
                        className="mt-space-md rounded-lg border border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface"
                      >
                        {pushResultMessage(push.result, copy.alerts)}
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <footer className="flex shrink-0 flex-col gap-space-sm border-t border-outline-variant px-gutter py-space-md">
              {state.screen === 'alerts' && push.status !== 'settled' ? (
                <>
                  <Button
                    type="button"
                    className="h-12 w-full text-label-md"
                    disabled={push.status === 'pending'}
                    onClick={() => void enablePush()}
                  >
                    {push.status === 'pending' ? copy.alerts.enabling : copy.alerts.enable}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full"
                    onClick={() => dispatch({ type: 'next' })}
                  >
                    {copy.alerts.notNow}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  className="h-12 w-full text-label-md"
                  disabled={!canAdvance(state)}
                  onClick={() => dispatch({ type: 'next' })}
                >
                  {copy.continue}
                </Button>
              )}
            </footer>
          </>
        ) : (
          <PaywallScreen
            purchase={state.purchase}
            titleRef={titleRef}
            titleId={TITLE_ID}
            onStartPurchase={() => dispatch({ type: 'startPurchase' })}
            onFinish={() => dispatch({ type: 'finish' })}
          />
        )}
      </div>
    </div>
  );
}
