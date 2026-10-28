'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { OverlayShell } from '@/components/onboarding/OverlayShell';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';
import { AccountStep } from '@/components/onboarding/steps/AccountStep';
import { AlertsMock } from '@/components/onboarding/steps/AlertsMock';
import { BuildingFeed } from '@/components/onboarding/steps/BuildingFeed';
import { MiniFeedCard } from '@/components/onboarding/steps/MiniFeedCard';
import { PhotoCollage } from '@/components/onboarding/steps/PhotoCollage';
import { useCityTeaser, useRegionTeaser } from '@/components/onboarding/useOnboardingData';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { useMessages } from '@/lib/i18n/useMessages';
import { fetchActiveListingsClient } from '@/lib/listings/client-queries';
import { ONBOARDING_CITY_ORDER } from '@/lib/listings/filters';
import type { ListingRow } from '@/lib/listings/types';
import {
  isOnboardingResumeParam,
  isPaywallFlagEnabled,
  markOnboardingCompleted,
  urlWithoutForceParam,
} from '@/lib/paywall/gate';
import {
  INITIAL_ONBOARDING_STATE,
  INTRO_STEPS,
  canAdvance,
  canGoBack,
  clearResumeState,
  introStepIndex,
  isSkippable,
  onboardingReducer,
  persistResumeState,
  readResumeState,
  type OnboardingAction,
  type OnboardingState,
} from '@/lib/paywall/onboarding-flow';
import {
  ONBOARDING_INTERESTS,
  interestsToAlertKeyword,
  onboardingFilterPrefs,
} from '@/lib/paywall/onboarding-interests';
import { readFilterPrefs, writeFilterPrefs } from '@/lib/filter-prefs/storage';
import { insertAlert } from '@/lib/alerts/db';
import { createClient } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { requestPushPermissionAndSubscribe, type PushSubscribeResult } from '@/lib/pwa/usePushSubscribe';
import { cn } from '@/lib/utils';
import type { Messages } from '@/messages';

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

function StepTitle({ title, emphasis }: { title: string; emphasis: string }) {
  return (
    <h1
      id={TITLE_ID}
      tabIndex={-1}
      className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-on-surface outline-none"
    >
      <EmphasisTitle title={title} emphasis={emphasis} />
    </h1>
  );
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
        {canGoBack(state.screen) ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'back' })}
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline"
            aria-label={messages.onboarding.back}
          >
            <SymbolIcon name="arrow_back" />
          </button>
        ) : (
          <CompactLocaleChip />
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
        {isSkippable(state.screen) ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'skip' })}
            className="h-11 rounded px-space-sm text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-outline"
          >
            {messages.onboarding.skip}
          </button>
        ) : null}
      </div>
    </header>
  );
}

function ChipRow<T extends string>({
  options,
  isActive,
  onToggle,
  labelFor,
  columns,
}: {
  options: readonly T[];
  isActive: (value: T) => boolean;
  onToggle: (value: T) => void;
  labelFor: (value: T) => string;
  columns?: boolean;
}) {
  return (
    <div
      className={cn('mt-space-lg flex flex-wrap gap-space-sm', columns && 'flex-col')}
      role="group"
      aria-labelledby={TITLE_ID}
    >
      {options.map((value) => {
        const active = isActive(value);
        return (
          <Button
            key={value}
            type="button"
            role="checkbox"
            aria-checked={active}
            variant={active ? 'chipActive' : 'chip'}
            className={cn('h-10 rounded-full px-space-md', columns && 'w-full justify-start')}
            onClick={() => onToggle(value)}
          >
            {labelFor(value)}
          </Button>
        );
      })}
    </div>
  );
}

export function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  const { messages } = useMessages();
  const { openInstallGuide } = usePwaOnboarding();
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING_STATE);
  const [push, setPush] = useState<PushState>({ status: 'idle' });
  const copy = messages.onboarding;
  const cityLabels = consumerCityLabelsFromMessages(messages);

  // Resume after the account step's auth redirect (?onboarding=resume) or any stored in-flight state.
  useEffect(() => {
    const resume = readResumeState(window.sessionStorage);
    const isResume = isOnboardingResumeParam(window.location.search);
    if (resume && (isResume || resume.screen === 'account' || resume.screen === 'alerts')) {
      dispatch({ type: 'resume', state: resume });
      clearResumeState(window.sessionStorage);
    }
  }, []);

  // Teaser data: region-wide (hook collage + Veneto counts) and per picked city.
  const region = useRegionTeaser();
  const cityTeaser = useCityTeaser(state.city);

  // One real listing for the "how it works" mini-cards.
  const [sampleListings, setSampleListings] = useState<ListingRow[]>([]);
  useEffect(() => {
    if (!getSupabaseEnv()) return;
    let cancelled = false;
    fetchActiveListingsClient().then(
      (rows) => !cancelled && setSampleListings(rows.slice(0, 3)),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current = document.getElementById(TITLE_ID) as HTMLHeadingElement | null;
    titleRef.current?.focus({ preventScroll: true });
  }, [state.screen]);

  // Finish: persist answers to filter prefs, mark done, clean URL.
  useEffect(() => {
    if (state.screen !== 'done') return;
    markOnboardingCompleted(window.localStorage);
    writeFilterPrefs(
      onboardingFilterPrefs(readFilterPrefs(), {
        city: state.city,
        interests: state.interests,
        radiusKm: state.radiusKm,
        locationGranted: state.locationGranted,
      }),
    );
    clearResumeState(window.sessionStorage);
    window.history.replaceState(window.history.state, '', urlWithoutForceParam(window.location.href));
    onFinish();
    const pendingInstallGuide =
      push.status === 'settled' && !push.result.ok && push.result.reason === 'ios_not_ready';
    if (pendingInstallGuide) openInstallGuide();
  }, [state.screen, state.city, state.interests, state.radiusKm, state.locationGranted, onFinish, openInstallGuide, push]);

  // Best-effort: once push is enabled (so the user is signed in), create one honest alert from answers.
  const createAlertFromAnswers = useCallback(async () => {
    if (!getSupabaseEnv()) return;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const keyword = interestsToAlertKeyword(state.interests);
      if (!keyword && !state.city) return;
      await insertAlert(supabase, {
        user_id: user.id,
        keyword,
        zone: null,
        city: state.city,
        enabled: true,
      });
    } catch {
      // Non-blocking: the user can always create alerts in Settings.
    }
  }, [state.city, state.interests]);

  const enablePush = useCallback(async () => {
    setPush({ status: 'pending' });
    const result = await requestPushPermissionAndSubscribe().catch(
      (): PushSubscribeResult => ({ ok: false, reason: 'subscribe_error' }),
    );
    if (result.ok) void createAlertFromAnswers();
    setPush({ status: 'settled', result });
  }, [createAlertFromAnswers]);

  const persistForRedirect = useCallback(() => {
    persistResumeState(window.sessionStorage, state);
  }, [state]);

  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, x: 16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -16 },
        transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      };

  // Personalized preview/paywall figures from real data.
  const previewCityLabel = state.city ? cityLabels[state.city] : null;
  const previewCount =
    state.city
      ? cityTeaser.status === 'ready'
        ? cityTeaser.count
        : null
      : region.status === 'ready'
        ? region.venetoCount
        : null;
  const previewPhotos =
    state.city && cityTeaser.status === 'ready' && cityTeaser.photos.length > 0
      ? cityTeaser.photos
      : region.status === 'ready'
        ? region.collage
        : [];
  const previewLoading = state.city ? cityTeaser.status === 'loading' : region.status === 'loading';
  const proofCount = region.status === 'ready' && region.venetoNew7d > 0 ? region.venetoNew7d : null;

  const paywallContext = useMemo(
    () => ({
      cityLabel: previewCityLabel ?? copy.regionLabel,
      count: previewCount,
      photos: previewPhotos.slice(0, 3).map((photo) => photo.url),
      proofCount,
    }),
    [previewCityLabel, previewCount, previewPhotos, proofCount, copy.regionLabel],
  );

  if (state.screen === 'done') return null;

  const isIntro = state.screen !== 'paywall';

  const footerContinue = (
    <footer className="flex shrink-0 flex-col gap-space-sm border-t border-outline-variant px-gutter py-space-md">
      <Button
        type="button"
        className="h-12 w-full text-label-md"
        disabled={!canAdvance(state)}
        onClick={() => dispatch({ type: 'next' })}
        data-testid="onboarding-continue"
      >
        {copy.continue}
      </Button>
    </footer>
  );

  return (
    <OverlayShell labelledBy={TITLE_ID} testId="onboarding-overlay" screen={state.screen}>
      {isIntro ? (
        <>
          <IntroHeader state={state} dispatch={dispatch} messages={messages} />

          {state.screen === 'account' ? (
            <AccountStep
              copy={copy.account}
              onBeforeRedirect={persistForRedirect}
              onContinue={() => dispatch({ type: 'next' })}
            />
          ) : (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={state.screen}
                  className="no-scrollbar flex-1 overflow-y-auto px-gutter pt-space-lg pb-space-md"
                  {...motionProps}
                >
                  {state.screen === 'hook' && (
                    <>
                      <StepTitle title={copy.hook.title} emphasis={copy.hook.emphasis} />
                      <p className="mt-space-sm text-body-lg text-on-surface-variant">{copy.hook.body}</p>
                      {region.status === 'ready' && region.venetoCount > 0 && (
                        <p className="mt-space-sm text-label-md text-on-surface" data-testid="hook-live-line">
                          {copy.hook.liveLine(region.venetoCount)}
                        </p>
                      )}
                      <div className="mt-space-lg">
                        <PhotoCollage photos={region.status === 'ready' ? region.collage : []} />
                      </div>
                    </>
                  )}

                  {state.screen === 'how' && (
                    <>
                      <StepTitle title={copy.how.title} emphasis={copy.how.emphasis} />
                      <div className="mt-space-lg flex gap-space-md overflow-x-auto no-scrollbar pb-space-xs">
                        {sampleListings.map((listing) => (
                          <MiniFeedCard key={listing.id} listing={listing} />
                        ))}
                      </div>
                      <ul className="mt-space-lg">
                        {copy.how.rows.map((row) => (
                          <li
                            key={row}
                            className="flex gap-space-md border-t border-outline-variant py-space-md first:border-t-0"
                          >
                            <SymbolIcon name="check" className="mt-0.5 text-[20px] text-on-surface" />
                            <p className="text-body-md text-on-surface">{row}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {state.screen === 'interests' && (
                    <>
                      <StepTitle title={copy.interests.title} emphasis={copy.interests.emphasis} />
                      <p className="mt-space-sm text-body-md text-on-surface-variant">{copy.interests.hint}</p>
                      <ChipRow
                        options={ONBOARDING_INTERESTS.map((interest) => interest.key)}
                        isActive={(key) => state.interests.includes(key)}
                        onToggle={(key) => dispatch({ type: 'toggleInterest', interest: key })}
                        labelFor={(key) => copy.interests.chips[key as keyof typeof copy.interests.chips]}
                      />
                    </>
                  )}

                  {state.screen === 'mobility' && (
                    <>
                      <StepTitle title={copy.mobility.title} emphasis={copy.mobility.emphasis} />
                      <p className="mt-space-sm text-body-md text-on-surface-variant">{copy.mobility.hint}</p>
                      <ChipRow
                        options={['foot', 'bike', 'car'] as const}
                        isActive={(key) => state.mobility === key}
                        onToggle={(key) => dispatch({ type: 'selectMobility', mobility: key })}
                        labelFor={(key) => copy.mobility.options[key]}
                        columns
                      />
                    </>
                  )}

                  {state.screen === 'city' && (
                    <>
                      <StepTitle title={copy.city.title} emphasis={copy.city.emphasis} />
                      <p className="mt-space-sm text-body-md text-on-surface-variant">{copy.city.body}</p>
                      <div
                        className="mt-space-lg flex flex-wrap gap-space-sm"
                        role="radiogroup"
                        aria-labelledby={TITLE_ID}
                      >
                        {ONBOARDING_CITY_ORDER.map((city) => {
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
                    </>
                  )}

                  {state.screen === 'preview' && (
                    <div data-testid="onboarding-preview">
                      <StepTitle title={copy.preview.title} emphasis={copy.preview.emphasis} />
                      {previewLoading ? (
                        <BuildingFeed
                          title={copy.preview.building}
                          items={[
                            copy.preview.checkCity(previewCityLabel ?? copy.regionLabel),
                            copy.preview.checkInterests,
                            copy.preview.checkRadius(state.radiusKm),
                          ]}
                        />
                      ) : previewCount !== null ? (
                        <>
                          <p className="mt-space-sm text-label-lg font-semibold text-on-surface" data-testid="preview-count">
                            {copy.preview.result(previewCount, previewCityLabel ?? copy.regionLabel)}
                          </p>
                          {previewCount <= 3 && (
                            <p className="mt-space-xs text-body-md text-on-surface-variant">
                              {copy.preview.lowSupply(previewCount, previewCityLabel ?? copy.regionLabel)}
                            </p>
                          )}
                          <div
                            className="pointer-events-none mt-space-lg grid grid-cols-2 gap-space-sm sm:grid-cols-3"
                            aria-hidden
                          >
                            {previewPhotos.slice(0, 6).map((photo) => (
                              <div
                                key={photo.key}
                                className="relative aspect-square overflow-hidden rounded-2xl bg-surface-container-high"
                              >
                                <div className="absolute inset-0 scale-110 blur-[12px]">
                                  <ListingPhoto src={photo.url} alt="" variant="thumbnail" sizes="180px" />
                                </div>
                                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80">
                                  <SymbolIcon name="lock" className="text-[14px] text-on-surface" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="mt-space-md text-body-md text-on-surface-variant">{copy.preview.unavailable}</p>
                      )}
                    </div>
                  )}

                  {state.screen === 'alerts' && (
                    <>
                      <StepTitle title={copy.alerts.title} emphasis={copy.alerts.emphasis} />
                      <p className="mt-space-md text-body-lg text-on-surface-variant">{copy.alerts.body}</p>
                      <AlertsMock
                        label={copy.alerts.mockLabel}
                        lines={[
                          copy.alerts.mockLine,
                          copy.alerts.mockLine2(previewCityLabel ?? copy.regionLabel),
                        ]}
                      />
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

              {state.screen === 'preview' ? (
                <footer className="flex shrink-0 flex-col gap-space-sm border-t border-outline-variant px-gutter py-space-md">
                  <Button
                    type="button"
                    className="h-12 w-full text-label-md"
                    onClick={() => dispatch({ type: 'next' })}
                    data-testid="preview-save"
                  >
                    {copy.preview.cta}
                  </Button>
                </footer>
              ) : state.screen === 'alerts' ? (
                <footer className="flex shrink-0 flex-col gap-space-sm border-t border-outline-variant px-gutter py-space-md">
                  {push.status !== 'settled' || !push.result.ok ? (
                    <Button
                      type="button"
                      className="h-12 w-full text-label-md"
                      disabled={push.status === 'pending'}
                      onClick={() => void enablePush()}
                    >
                      {push.status === 'pending' ? copy.alerts.enabling : copy.alerts.enable}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full"
                    onClick={() => dispatch({ type: 'next' })}
                  >
                    {push.status === 'settled' && push.result.ok ? copy.continue : copy.alerts.notNow}
                  </Button>
                </footer>
              ) : (
                footerContinue
              )}
            </>
          )}
        </>
      ) : (
        <PaywallScreen titleId={TITLE_ID} onFinish={() => dispatch({ type: 'finish' })} context={paywallContext} />
      )}
    </OverlayShell>
  );
}
