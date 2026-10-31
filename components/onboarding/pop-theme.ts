import { Bricolage_Grotesque } from 'next/font/google';
import type { CSSProperties } from 'react';

/**
 * "Lagoon Pop" — the onboarding/paywall-only theme (quick 261030-ob3, Stitch project
 * 9058658661756179433). The main app stays monochrome (DESIGN.md); inside the overlay we re-point the
 * same Tailwind color tokens at a playful palette, so shared components (Button, chips, locale chip)
 * pick it up and dark mode cannot leak in.
 */
export const popDisplayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-pop',
  display: 'swap',
});

export const POP = {
  ink: '#1A1A2E',
  inkSoft: '#4A4A5E',
  cream: '#FFF8EE',
  coral: '#F2512D',
  teal: '#00A6A6',
  sun: '#FFC83D',
  lilac: '#B69CFF',
  mint: '#7FE0B0',
  sky: '#9AD4F5',
  pink: '#FFB3C7',
  peach: '#FFC9A8',
} as const;

/** Token overrides scoped to the overlay root. */
export const POP_TOKENS = {
  '--color-background': POP.cream,
  '--color-on-background': POP.ink,
  '--color-surface': '#FFFFFF',
  '--color-surface-container-lowest': '#FFFFFF',
  '--color-surface-container-low': '#FFF3E4',
  '--color-surface-container': '#FBEBD8',
  '--color-surface-container-high': '#F3E2CF',
  '--color-on-surface': POP.ink,
  '--color-on-surface-variant': POP.inkSoft,
  '--color-primary': POP.coral,
  '--color-on-primary': '#FFFFFF',
  '--color-primary-container': '#D9441F',
  '--color-outline': POP.ink,
  '--color-outline-variant': '#E6D5C0',
  colorScheme: 'light',
} as CSSProperties;

/** Soft page tint per screen, so the flow feels like turning colorful pages. */
export const SCREEN_TINT: Record<string, string> = {
  hook: 'bg-[#FFF1E6]',
  how: 'bg-[#EAF8F2]',
  weekly: 'bg-[#FFF8DD]',
  map: 'bg-[#E8F4FB]',
  favorites: 'bg-[#FFEFF3]',
  interests: 'bg-[#F3EEFF]',
  mobility: 'bg-[#E8F4FB]',
  city: 'bg-[#FFF8DD]',
  preview: 'bg-gradient-to-b from-[#FFE9DC] to-[#FFE3EC]',
  account: 'bg-[#F3EEFF]',
  alerts: 'bg-[#E8F4FB]',
  paywall: 'bg-[#FFF8EE]',
};

/** Neo-brutalist-light building blocks. */
export const pop = {
  display: 'font-[family-name:var(--font-pop)] font-extrabold tracking-[-0.02em] text-[#1A1A2E]',
  outline: 'border-2 border-[#1A1A2E]',
  shadow: 'shadow-[3px_3px_0_#1A1A2E]',
  shadowSm: 'shadow-[2px_2px_0_#1A1A2E]',
  card: 'rounded-3xl border-2 border-[#1A1A2E] bg-white shadow-[3px_3px_0_#1A1A2E]',
  sticker: 'rounded-2xl border-[3px] border-white shadow-[0_6px_14px_rgba(26,26,46,0.18)]',
  pill: 'inline-flex items-center gap-1.5 rounded-full border-2 border-[#1A1A2E] bg-white px-3 py-1 text-label-sm font-semibold text-[#1A1A2E]',
  primaryButton:
    'h-14 w-full rounded-full border-2 border-[#1A1A2E] bg-[#F2512D] text-[18px] font-bold text-white shadow-[0_4px_0_#1A1A2E] transition-transform hover:bg-[#E5461F] active:translate-y-[3px] active:shadow-[0_1px_0_#1A1A2E] disabled:opacity-50 disabled:active:translate-y-0',
  secondaryButton:
    'h-12 w-full rounded-full border-2 border-[#1A1A2E] bg-white text-label-md font-semibold text-[#1A1A2E] hover:bg-[#FFF3E4]',
  ghostButton: 'h-11 w-full rounded-full text-label-md font-semibold text-[#4A4A5E] hover:bg-black/5 hover:text-[#1A1A2E]',
} as const;

/** Pastel fills used for option tiles, cycling in order. */
export const PASTELS = ['bg-[#FFE3D3]', 'bg-[#DDF0FF]', 'bg-[#FFE0EC]', 'bg-[#FFF2B8]', 'bg-[#D6F5E6]', 'bg-[#EAE2FF]'] as const;
