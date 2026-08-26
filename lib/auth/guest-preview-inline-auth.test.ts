import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('D-19-02 guest listing preview with inline passwordless auth', () => {
  it('DetailPreviewWall embeds AuthPromptForm with shortened hero and guest-auth-form', () => {
    const source = readSource('components/detail/DetailPreviewWall.tsx');
    expect(source).toMatch(/AuthPromptForm/);
    expect(source).toMatch(/messages\.auth\.detailTitle/);
    expect(source).toMatch(/messages\.detail\.previewSubtitle/);
    expect(source).toMatch(/h-\[min\(36vh,240px\)\]/);
    expect(source).toMatch(/guest-auth-form/);
    expect(source).toMatch(/redirectTo/);
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

  it('AuthPromptModal wraps AuthPromptForm so other gates keep Google / Apple / email OTP', () => {
    const modal = readSource('components/ugc/AuthPromptModal.tsx');
    expect(modal).toMatch(/AuthPromptForm/);
    const form = readSource('components/ugc/AuthPromptForm.tsx');
    expect(form).toMatch(/signInWithOAuth/);
    expect(form).toMatch(/signInWithOtp/);
    expect(form).toMatch(/APPLE_OAUTH_ENABLED/);
    expect(form).toMatch(/buildRedirectToUrl/);
    expect(form).toMatch(/messages\.auth\.checkEmail/);
    expect(form).toMatch(/messages\.auth\.sendError/);
    expect(form).toMatch(/messages\.auth\.oauthError/);
  });
});

describe('guest preview heart focuses inline form (locked CONTEXT favorite heart)', () => {
  it('FavoriteButton invokes onUnauthenticated without mounting a dialog when that callback is passed', () => {
    const source = readSource('components/listings/FavoriteButton.tsx');
    expect(source).toMatch(/onUnauthenticated\?: \(\) => void/);
    expect(source).toMatch(/onUnauthenticated\(\)/);
    expect(source).toMatch(/onUnauthenticated === undefined/);
    expect(source).toMatch(/AuthPromptModal/);
  });

  it('default FavoriteButton still mounts AuthPromptModal for feed cards', () => {
    const source = readSource('components/listings/FavoriteButton.tsx');
    expect(source).toMatch(/<AuthPromptModal/);
    expect(source).toMatch(/setAuthOpen\(true\)/);
  });

  it('DetailHeroControls forwards onFavoriteUnauthed to FavoriteButton as onUnauthenticated', () => {
    const source = readSource('components/detail/DetailHeroControls.tsx');
    expect(source).toMatch(/onFavoriteUnauthed\?: \(\) => void/);
    expect(source).toMatch(/onUnauthenticated=\{onFavoriteUnauthed\}/);
  });

  it('DetailPreviewWall onFavoriteUnauthed scrolls to and focuses #guest-auth-form', () => {
    const source = readSource('components/detail/DetailPreviewWall.tsx');
    expect(source).toMatch(/onFavoriteUnauthed/);
    expect(source).toMatch(/guest-auth-form/);
    expect(source).toMatch(/scrollIntoView\(\{\s*behavior:\s*'smooth',\s*block:\s*'nearest'\s*\}\)/);
    expect(source).toMatch(/querySelector(?:<HTMLElement>)?\(['"]button, input['"]\)/);
  });
});
