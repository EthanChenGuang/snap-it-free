import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('D-19-02 guest listing preview with floating auth gate', () => {
  it('DetailPreviewWall shows teaser metadata and GuestAuthGateCard overlay', () => {
    const source = readSource('components/detail/DetailPreviewWall.tsx');
    expect(source).toMatch(/GuestAuthGateCard/);
    expect(source).toMatch(/listing-detail-guest-preview/);
    expect(source).toMatch(/listing-detail-guest-gate/);
    expect(source).toMatch(/listing-detail-locked-tease/);
    expect(source).toMatch(/via-white\/85/);
    expect(source).not.toMatch(/dark:from-zinc/);
    expect(source).toMatch(/AnimatePresence/);
    expect(source).toMatch(/\.join\(' · '\)/);
    expect(source).not.toMatch(/previewSubtitle/);
    expect(source).not.toMatch(/AuthPromptForm/);
    expect(source).toMatch(/guest-auth-form/);
    expect(source).toMatch(/redirectTo/);
    expect(source).toMatch(/verifiedFree/);
  });

  it('GuestAuthGateCard implements Google-primary OAuth and inline magic-link email', () => {
    const card = readSource('components/detail/GuestAuthGateCard.tsx');
    expect(card).toMatch(/useOAuthSignIn/);
    expect(card).toMatch(/signInWithOtp/);
    expect(card).toMatch(/guestGateTitle/);
    expect(card).toMatch(/guestGateSubtitle/);
    expect(card).not.toMatch(/dark:/);
    expect(card).toMatch(/arrow_forward/);
    expect(card).not.toMatch(/isFacebookOAuthEnabled/);
    expect(card).not.toMatch(/facebookSignIn/);
  });

  it('ScrapedListingShell guest branch uses DetailPreviewWall with redirectTo and no dialog open-state setter', () => {
    const source = readSource('components/detail/ScrapedListingShell.tsx');
    expect(source).toMatch(/<DetailPreviewWall[\s\S]*redirectTo=/);
    expect(source).not.toMatch(/setAuthOpen/);
    expect(source).not.toMatch(/authOpen/);
  });

  it('UgcListingShell guest preview uses DetailPreviewWall with redirectTo; previewAuthOpen is absent; contactAuthOpen remains', () => {
    const source = readSource('components/detail/UgcListingShell.tsx');
    expect(source).toMatch(/<DetailPreviewWall[\s\S]*redirectTo=/);
    expect(source).not.toMatch(/previewAuthOpen/);
    expect(source).toMatch(/contactAuthOpen/);
  });

  it('AuthPromptModal wraps AuthPromptForm so other gates keep Google / email OTP', () => {
    const modal = readSource('components/ugc/AuthPromptModal.tsx');
    expect(modal).toMatch(/AuthPromptForm/);
    const form = readSource('components/ugc/AuthPromptForm.tsx');
    expect(form).toMatch(/useOAuthSignIn/);
    expect(form).toMatch(/signInWithOtp/);
    expect(form).not.toMatch(/facebookSignIn/);
    expect(form).not.toMatch(/isFacebookOAuthEnabled/);
    expect(form).toMatch(/buildOAuthCallbackUrl/);
    expect(form).toMatch(/messages\.auth\.checkEmail/);
    expect(form).toMatch(/messages\.auth\.sendError/);
    expect(form).toMatch(/messages\.auth\.oauthError/);
    expect(form).toMatch(/isAuthBusy/);
  });
});

describe('guest preview heart focuses inline gate email (locked CONTEXT favorite heart)', () => {
  it('FavoriteButton invokes onUnauthenticated without mounting a dialog when that callback is passed', () => {
    const source = readSource('components/listings/FavoriteButton.tsx');
    expect(source).toMatch(/onUnauthenticated\?: \(\) => void/);
    expect(source).toMatch(/onUnauthenticated\(\)/);
    expect(source).toMatch(/onUnauthenticated === undefined/);
    expect(source).toMatch(/AuthPromptModal/);
  });

  it('feed FavoriteButton toggles locally without opening auth modal', () => {
    const source = readSource('components/listings/FavoriteButton.tsx');
    expect(source).toMatch(/setPendingFavorited\(!wasFavorited\)/);
    expect(source).toMatch(/await toggle\(listingId, wasFavorited\)/);
    expect(source).not.toMatch(/setAuthOpen\(true\)/);
  });

  it('FavoriteButton uses remove on /favorites so guests can unfavorite saved items', () => {
    const source = readSource('components/listings/FavoriteButton.tsx');
    expect(source).toMatch(/pathname\.startsWith\('\/favorites'\)/);
    expect(source).toMatch(/await remove\(listingId\)/);
  });

  it('FavoritesPageClient optimistically prunes cards when favorites change', () => {
    const source = readSource('components/listings/FavoritesPageClient.tsx');
    expect(source).toMatch(/readFavoriteIds\(\)/);
    expect(source).toMatch(/setListings\(\(prev\) => prev\.filter/);
  });

  it('DetailHeroControls forwards onFavoriteUnauthed to FavoriteButton as onUnauthenticated', () => {
    const source = readSource('components/detail/DetailHeroControls.tsx');
    expect(source).toMatch(/onFavoriteUnauthed\?: \(\) => void/);
    expect(source).toMatch(/onUnauthenticated=\{onFavoriteUnauthed\}/);
  });

  it('DetailPreviewWall onFavoriteUnauthed reopens gate and focuses guest-gate-email', () => {
    const source = readSource('components/detail/DetailPreviewWall.tsx');
    expect(source).toMatch(/onFavoriteUnauthed/);
    expect(source).toMatch(/guest-gate-email/);
    expect(source).toMatch(/preventScroll:\s*true/);
    expect(source).toMatch(/setGateOpen\(true\)/);
  });
});
