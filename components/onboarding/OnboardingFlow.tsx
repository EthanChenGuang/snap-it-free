'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { OverlayShell } from '@/components/onboarding/OverlayShell';
import { PASTELS, pop } from '@/components/onboarding/pop-theme';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';
import { AccountStep } from '@/components/onboarding/steps/AccountStep';
import { AlertsMock } from '@/components/onboarding/steps/AlertsMock';
import { BuildingFeed } from '@/components/onboarding/steps/BuildingFeed';
import { MiniFeedCard } from '@/components/onboarding/steps/MiniFeedCard';
import { PhotoCollage, Sparkle } from '@/components/onboarding/steps/PhotoCollage';
import { useCityTeaser, useRegionTeaser } from '@/components/onboarding/useOnboardingData';
import { usePwaOnboarding } from '@/components/providers/PwaOnboardingProvider';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { ArrowRight, SymbolIcon } from '@/components/onboarding/SymbolIcon';
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

/** Headline with one word on a sticker-style highlighter swash; plain text if the word is absent. */
function EmphasisTitle({ title, emphasis }: { title: string; emphasis: string }) {
  const at = title.indexOf(emphasis);
  if (at < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className="relative mx-0.5 inline-block -rotate-2 rounded-full border-2 border-[#1A1A2E] bg-[#FFC83D] px-2.5 leading-[1.15] shadow-[2px_2px_0_#1A1A2E]">
        {emphasis}
      </span>
      {title.slice(at + emphasis.length)}
    </>
  );
}

function StepTitle({ title, emphasis }: { title: string; emphasis: string }) {
  return (
    <h1 id={TITLE_ID} tabIndex={-1} className={cn(pop.display, 'text-[32px] leading-[1.2] outline-none')}>
      <EmphasisTitle title={title} emphasis={emphasis} />
    </h1>
  );
}

const INTEREST_EMOJI: Record<string, string> = {
  furniture: '🛋️',
  electronics: '🎧',
  clothes: '👕',
  books: '📚',
  home_decor: '🪴',
  everything: '✨',
};

const MOBILITY_EMOJI = { foot: '🚶', bike: '🚲', car: '🚗' } as const;

const HOW_ICONS = ['bolt', 'schedule', 'map'] as const;
const HOW_FILLS = ['bg-[#EAE2FF]', 'bg-[#FFF2B8]', 'bg-[#D6F5E6]'] as const;
const HOW_DOTS = ['bg-[#B69CFF]', 'bg-[#FFC83D]', 'bg-[#7FE0B0]'] as const;

/** "Bike or vaporetto (~5 km)" → ["Bike or vaporetto", "~5 km"]; works for （） too. */
function splitDistance(label: string): [string, string | null] {
  const match = label.match(/^(.*?)\s*[（(]([^()（）]+)[)）]\s*$/);
  return match ? [match[1], match[2]] : [label, null];
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
    <header className="flex h-16 shrink-0 items-center gap-space-md px-space-md">
      <div className="flex w-16 justify-start">
        {canGoBack(state.screen) ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'back' })}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1A1A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]',
              pop.outline,
              pop.shadowSm,
            )}
            aria-label={messages.onboarding.back}
          >
            <SymbolIcon name="arrow_back" />
          </button>
        ) : (
          <CompactLocaleChip />
        )}
      </div>
      <div className="flex flex-1 items-center gap-1" aria-hidden>
        {INTRO_STEPS.map((step, stepIndex) => (
          <span
            key={step}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors duration-300',
              stepIndex < index ? 'bg-[#1A1A2E]' : stepIndex === index ? 'bg-[#F2512D]' : 'bg-[#1A1A2E]/15',
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
            className="h-11 rounded-full px-space-sm text-label-md font-semibold text-[#4A4A5E] hover:bg-black/5 hover:text-[#1A1A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]"
          >
            {messages.onboarding.skip}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function OnboardingFlow({ onFinish }: { onFinish: () => void }) {
  const { messages, language } = useMessages();
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

  // Paywall (and Stripe redirect): write city / interests / radius so the feed opens with them applied
  // even if the user never hits `done` (they left for Checkout). Resume lets the return path re-apply.
  useEffect(() => {
    if (state.screen !== 'paywall') return;
    persistResumeState(window.sessionStorage, state);
    writeFilterPrefs(
      onboardingFilterPrefs(readFilterPrefs(), {
        city: state.city,
        interests: state.interests,
        radiusKm: state.radiusKm,
        locationGranted: state.locationGranted,
      }),
    );
  }, [state]);

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
  const cityOrRegion = previewCityLabel ?? copy.regionLabel;
  const answerChips = [
    previewCityLabel ? `📍 ${previewCityLabel}` : null,
    ...state.interests.map((key) => `${INTEREST_EMOJI[key] ?? ''} ${copy.interests.chips[key as keyof typeof copy.interests.chips]}`.trim()),
    `${state.mobility ? MOBILITY_EMOJI[state.mobility] : '📏'} ${state.radiusKm} km`,
  ].filter((chip): chip is string => Boolean(chip));

  const footerContinue = (
    <footer className="flex shrink-0 flex-col gap-space-sm px-gutter pb-space-md pt-space-sm">
      <Button
        type="button"
        className={pop.primaryButton}
        disabled={!canAdvance(state)}
        onClick={() => dispatch({ type: 'next' })}
        data-testid="onboarding-continue"
      >
        {copy.continue}
        <ArrowRight />
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
              summary={answerChips}
              onBeforeRedirect={persistForRedirect}
              onContinue={() => dispatch({ type: 'next' })}
            />
          ) : (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={state.screen}
                  className="no-scrollbar relative flex-1 overflow-y-auto px-gutter pt-space-sm pb-space-md"
                  {...motionProps}
                >
                  {state.screen === 'hook' && (
                    <>
                      <PhotoCollage
                        photos={region.status === 'ready' ? region.collage : []}
                        freeLabel={messages.listing.free}
                      />
                      <div className="mt-space-md text-center">
                        <StepTitle title={copy.hook.title} emphasis={copy.hook.emphasis} />
                        <p className="mt-space-sm text-body-lg text-[#4A4A5E]">{copy.hook.body}</p>
                        {region.status === 'ready' && region.venetoCount > 0 && (
                          <p className={cn(pop.pill, 'mt-space-md')} data-testid="hook-live-line">
                            <LiveDot />
                            {copy.hook.liveLine(region.venetoCount)}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {state.screen === 'how' && (
                    <>
                      <StepTitle title={copy.how.title} emphasis={copy.how.emphasis} />
                      {sampleListings.length > 0 && (
                        <div className="relative mt-space-lg flex justify-center gap-space-md px-space-xs py-space-xs">
                          {sampleListings.slice(0, 2).map((listing, index) => (
                            <MiniFeedCard key={listing.id} listing={listing} tilt={index === 0 ? -4 : 4} />
                          ))}
                          <Sparkle className="-top-1 right-1 h-6 w-6 text-[#F2512D]" />
                          <Sparkle className="bottom-2 left-0 h-5 w-5 text-[#00A6A6]" />
                        </div>
                      )}
                      <ul className="mt-space-lg flex flex-col gap-space-sm">
                        {copy.how.rows.map((row, index) => (
                          <li
                            key={row}
                            className={cn('flex items-center gap-space-md rounded-2xl px-space-md py-space-sm', pop.outline, pop.shadowSm, HOW_FILLS[index % 3])}
                          >
                            <span
                              className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1A1A2E]', pop.outline, HOW_DOTS[index % 3])}
                            >
                              <SymbolIcon name={HOW_ICONS[index % 3]} className="text-[22px]" />
                            </span>
                            <p className="text-body-md font-semibold text-[#1A1A2E]">{row}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {state.screen === 'interests' && (
                    <>
                      <StepTitle title={copy.interests.title} emphasis={copy.interests.emphasis} />
                      <p className="mt-space-sm text-body-md text-[#4A4A5E]">{copy.interests.hint}</p>
                      <div className="mt-space-lg grid grid-cols-2 gap-space-md" role="group" aria-labelledby={TITLE_ID}>
                        {ONBOARDING_INTERESTS.map((interest, index) => {
                          const active = state.interests.includes(interest.key);
                          return (
                            <button
                              key={interest.key}
                              type="button"
                              role="checkbox"
                              aria-checked={active}
                              onClick={() => dispatch({ type: 'toggleInterest', interest: interest.key })}
                              className={cn(
                                'relative flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-[#1A1A2E] text-[#1A1A2E] transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]',
                                PASTELS[index % PASTELS.length],
                                active ? 'shadow-[4px_4px_0_#1A1A2E] -translate-y-0.5' : 'border-[#1A1A2E]/25',
                                active && (index % 2 === 0 ? '-rotate-2' : 'rotate-2'),
                              )}
                            >
                              <span className="text-[36px] leading-none" aria-hidden>
                                {INTEREST_EMOJI[interest.key]}
                              </span>
                              <span className="text-label-md font-bold">
                                {copy.interests.chips[interest.key as keyof typeof copy.interests.chips]}
                              </span>
                              {active && (
                                <span
                                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1A1A2E] bg-[#00A6A6] text-white"
                                  aria-hidden
                                >
                                  <SymbolIcon name="check" className="text-[18px]" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {state.interests.length > 0 && (
                        <p className={cn(pop.pill, 'mt-space-md')} aria-live="polite">
                          <span className="h-2 w-2 rounded-full bg-[#00A6A6]" aria-hidden />
                          {copy.interests.selected(state.interests.length)}
                        </p>
                      )}
                    </>
                  )}

                  {state.screen === 'mobility' && (
                    <>
                      <StepTitle title={copy.mobility.title} emphasis={copy.mobility.emphasis} />
                      <p className="mt-space-sm text-body-md text-[#4A4A5E]">{copy.mobility.hint}</p>
                      <div className="mt-space-lg flex flex-col gap-space-md" role="group" aria-labelledby={TITLE_ID}>
                        {(['foot', 'bike', 'car'] as const).map((key, index) => {
                          const active = state.mobility === key;
                          const [label, distance] = splitDistance(copy.mobility.options[key]);
                          return (
                            <button
                              key={key}
                              type="button"
                              role="checkbox"
                              aria-checked={active}
                              aria-label={copy.mobility.options[key]}
                              onClick={() => dispatch({ type: 'selectMobility', mobility: key })}
                              className={cn(
                                'flex w-full items-center gap-space-md rounded-3xl border-2 px-space-md py-space-sm text-left transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]',
                                ['bg-[#FFE3D3]', 'bg-[#D6F5E6]', 'bg-[#FFF2B8]'][index],
                                active ? 'border-[#1A1A2E] shadow-[4px_4px_0_#1A1A2E] -translate-y-0.5' : 'border-[#1A1A2E]/25',
                              )}
                            >
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#1A1A2E] bg-white text-[26px]" aria-hidden>
                                {MOBILITY_EMOJI[key]}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-body-lg font-bold text-[#1A1A2E]">{label}</span>
                                {distance && (
                                  <span className="mt-0.5 inline-block rounded-full bg-white px-2 py-0.5 text-label-sm font-semibold text-[#1A1A2E]">
                                    {distance}
                                  </span>
                                )}
                              </span>
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#1A1A2E]',
                                  active ? 'bg-[#00A6A6] text-white' : 'bg-white',
                                )}
                                aria-hidden
                              >
                                {active && <SymbolIcon name="check" className="text-[18px]" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <RadiusRings active={state.mobility} />
                    </>
                  )}

                  {state.screen === 'city' && (
                    <>
                      <StepTitle title={copy.city.title} emphasis={copy.city.emphasis} />
                      <p className="mt-space-sm text-body-md text-[#4A4A5E]">{copy.city.body}</p>
                      <div className="mt-space-lg flex flex-wrap gap-space-sm" role="radiogroup" aria-labelledby={TITLE_ID}>
                        {ONBOARDING_CITY_ORDER.map((city) => {
                          const active = state.city === city;
                          return (
                            <button
                              key={city}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => dispatch({ type: 'selectCity', city })}
                              className={cn(
                                'h-11 rounded-full border-2 border-[#1A1A2E] px-space-md text-label-md font-bold transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6A6]',
                                active
                                  ? 'scale-105 bg-[#00A6A6] text-white shadow-[3px_3px_0_#1A1A2E]'
                                  : 'bg-white text-[#1A1A2E] hover:bg-[#FFF3E4]',
                              )}
                            >
                              {cityLabels[city]}
                            </button>
                          );
                        })}
                      </div>
                      {state.city && cityTeaser.status === 'ready' && cityTeaser.count > 0 && (
                        <p className={cn(pop.pill, 'mt-space-lg')} data-testid="city-live-count">
                          <LiveDot />
                          {copy.preview.result(cityTeaser.count, cityLabels[state.city])}
                        </p>
                      )}
                    </>
                  )}

                  {state.screen === 'preview' && (
                    <div data-testid="onboarding-preview">
                      <Sparkle className="right-6 top-2 h-6 w-6 text-[#F2512D]" />
                      <Sparkle className="right-16 top-10 h-4 w-4 text-[#B69CFF]" />
                      <StepTitle title={copy.preview.title} emphasis={copy.preview.emphasis} />
                      {previewLoading ? (
                        <BuildingFeed
                          title={copy.preview.building}
                          items={[
                            copy.preview.checkCity(cityOrRegion),
                            copy.preview.checkInterests,
                            copy.preview.checkRadius(state.radiusKm),
                          ]}
                        />
                      ) : previewCount !== null ? (
                        <>
                          <div className={cn('relative mt-space-lg p-space-lg', pop.card, 'bg-[#FFFBF2]')}>
                            <span className="absolute -right-2 -top-3 rotate-3 rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2.5 py-0.5 text-[11px] font-black uppercase text-[#1A1A2E]">
                              ● Live
                            </span>
                            <p className={cn(pop.display, 'text-[56px] leading-none text-[#F2512D]')} aria-hidden>
                              {previewCount.toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}
                            </p>
                            <p className="mt-space-xs text-body-lg font-semibold text-[#1A1A2E]" data-testid="preview-count">
                              {copy.preview.result(previewCount, cityOrRegion)}
                            </p>
                            {previewCount <= 3 && (
                              <p className="mt-space-xs text-body-md text-[#4A4A5E]">
                                {copy.preview.lowSupply(previewCount, cityOrRegion)}
                              </p>
                            )}
                            <ul className="mt-space-md flex flex-wrap gap-space-xs" aria-hidden>
                              {answerChips.map((chip, index) => (
                                <li
                                  key={chip}
                                  className={cn(
                                    'rounded-full border-2 border-[#1A1A2E] px-2.5 py-0.5 text-label-sm font-semibold text-[#1A1A2E]',
                                    PASTELS[(index + 3) % PASTELS.length],
                                  )}
                                >
                                  {chip}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="pointer-events-none mt-space-lg grid grid-cols-2 gap-space-md sm:grid-cols-3" aria-hidden>
                            {previewPhotos.slice(0, 4).map((photo, index) => (
                              <div
                                key={photo.key}
                                className={cn(
                                  'relative aspect-square overflow-hidden rounded-3xl bg-[#F3E2CF]',
                                  pop.outline,
                                  pop.shadowSm,
                                  index % 2 === 0 ? '-rotate-1' : 'rotate-1',
                                )}
                              >
                                <div className="absolute inset-0 scale-110 blur-[12px]">
                                  <ListingPhoto src={photo.url} alt="" variant="thumbnail" sizes="180px" />
                                </div>
                                <span className="absolute left-2 top-2 rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2 py-0.5 text-[11px] font-black uppercase text-[#1A1A2E]">
                                  €0
                                </span>
                                <span className="absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#1A1A2E] bg-white">
                                  <SymbolIcon name="lock" className="text-[20px] text-[#1A1A2E]" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="mt-space-md text-body-md text-[#4A4A5E]">{copy.preview.unavailable}</p>
                      )}
                    </div>
                  )}

                  {state.screen === 'alerts' && (
                    <>
                      <StepTitle title={copy.alerts.title} emphasis={copy.alerts.emphasis} />
                      <p className="mt-space-sm text-body-lg text-[#4A4A5E]">{copy.alerts.body}</p>
                      <AlertsMock
                        label={copy.alerts.mockLabel}
                        appName={messages.app.title}
                        photos={previewPhotos.slice(0, 2).map((photo) => photo.url)}
                        lines={[copy.alerts.mockLine, copy.alerts.mockLine2(cityOrRegion)]}
                      />
                      {push.status === 'settled' && (
                        <p role="status" className={cn('mt-space-xl p-space-md text-body-md text-[#1A1A2E]', pop.card, 'rounded-2xl')}>
                          {pushResultMessage(push.result, copy.alerts)}
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {state.screen === 'preview' ? (
                <footer className="flex shrink-0 flex-col gap-space-xs px-gutter pb-space-md pt-space-sm">
                  <Button
                    type="button"
                    className={pop.primaryButton}
                    onClick={() => dispatch({ type: 'next' })}
                    data-testid="preview-save"
                  >
                    {copy.preview.cta}
                    <ArrowRight />
                  </Button>
                  {/* Escape to pricing without being forced to sign up; the account step itself keeps no "Not now". */}
                  <Button
                    type="button"
                    variant="ghost"
                    className={pop.ghostButton}
                    onClick={() => dispatch({ type: 'goTo', screen: 'paywall' })}
                    data-testid="preview-see-plans"
                  >
                    {copy.preview.seePlans}
                  </Button>
                </footer>
              ) : state.screen === 'alerts' ? (
                <footer className="flex shrink-0 flex-col gap-space-xs px-gutter pb-space-md pt-space-sm">
                  {push.status !== 'settled' || !push.result.ok ? (
                    <Button
                      type="button"
                      className={pop.primaryButton}
                      disabled={push.status === 'pending'}
                      onClick={() => void enablePush()}
                    >
                      {push.status === 'pending' ? copy.alerts.enabling : copy.alerts.enable}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className={pop.ghostButton}
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
        <PaywallScreen
          titleId={TITLE_ID}
          onFinish={() => dispatch({ type: 'finish' })}
          context={paywallContext}
          source="onboarding"
          returnPath="/?onboarding=resume"
        />
      )}
    </OverlayShell>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
    </span>
  );
}

/** Decorative radius diagram: 1 / 5 / 15 km rings around a pin, the chosen ring highlighted. */
function RadiusRings({ active }: { active: 'foot' | 'bike' | 'car' | null }) {
  const rings = [
    { key: 'car', r: 92, label: '15 km' },
    { key: 'bike', r: 60, label: '5 km' },
    { key: 'foot', r: 30, label: '1 km' },
  ] as const;
  return (
    <div className={cn('mt-space-lg overflow-hidden rounded-3xl bg-[#CFEFF5]', pop.outline, pop.shadowSm)} aria-hidden>
      <svg viewBox="0 0 320 200" className="block h-auto w-full">
        <path d="M0 150 C 60 120, 110 175, 170 150 S 280 110, 320 135 V200 H0Z" fill="#B5E3EC" />
        <path d="M20 40 C 60 20, 90 60, 130 40" stroke="#9DD6E2" strokeWidth="10" fill="none" strokeLinecap="round" />
        {rings.map((ring) => {
          const on = ring.key === active;
          return (
            <g key={ring.key}>
              <circle
                cx="160"
                cy="100"
                r={ring.r}
                fill={on ? 'rgba(0,166,166,0.18)' : 'none'}
                stroke={on ? '#00A6A6' : '#1A1A2E'}
                strokeOpacity={on ? 1 : 0.35}
                strokeWidth={on ? 3 : 1.5}
                strokeDasharray={on ? undefined : '5 5'}
              />
              <text
                x={160 + ring.r * 0.72}
                y={100 - ring.r * 0.72}
                fontSize="11"
                fontWeight="700"
                fill={on ? '#00A6A6' : '#4A4A5E'}
              >
                {ring.label}
              </text>
            </g>
          );
        })}
        <circle cx="160" cy="100" r="11" fill="#F2512D" stroke="#1A1A2E" strokeWidth="2.5" />
        <circle cx="160" cy="100" r="4" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
