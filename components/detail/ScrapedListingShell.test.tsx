import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, click, flush, render } from '@/components/test/render';
import type { ListingRow } from '@/lib/listings/types';
import { ScrapedListingShell } from './ScrapedListingShell';

const openExternal = vi.hoisted(() => vi.fn());
vi.mock('@/lib/listings/external-url', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/listings/external-url')>()),
  openExternalListingUrl: openExternal,
}));
vi.mock('@/lib/auth/useAuthSession', () => ({ useAuthSession: () => ({ user: { id: 'u1' }, loading: false }) }));
vi.mock('@/components/detail/ListingDetailContent', () => ({
  ListingDetailContent: ({ onPrimaryAction }: { onPrimaryAction: () => void }) => (
    <button data-testid="primary" onClick={onPrimaryAction} />
  ),
}));
vi.mock('@/components/detail/ContactAssistantSheet', () => ({
  ContactAssistantSheet: ({ open }: { open: boolean }) => (open ? <div data-testid="sheet" /> : null),
}));

const listing = {
  id: 'l1',
  source: 'subito',
  title: 'Vetrina',
  photo_url: '',
  external_url: 'https://www.subito.it/x.htm',
  status: 'active',
} as unknown as ListingRow;

beforeEach(() => openExternal.mockReset());
afterEach(async () => {
  await cleanup();
});

describe('ScrapedListingShell primary action', () => {
  it.each(['zh', 'en'] as const)('opens the assistant sheet for %s', async (language) => {
    const container = await render(<ScrapedListingShell listing={listing} similarListings={[]} />, language);
    await click(container.querySelector('[data-testid="primary"]'));
    await flush();
    expect(container.ownerDocument.querySelector('[data-testid="sheet"]')).not.toBeNull();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('opens the seller page directly for Italian', async () => {
    const container = await render(<ScrapedListingShell listing={listing} similarListings={[]} />, 'it');
    await click(container.querySelector('[data-testid="primary"]'));
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(container.ownerDocument.querySelector('[data-testid="sheet"]')).toBeNull();
  });

  it.each(['vinted', 'wallapop', 'facebook'] as const)('opens %s directly even in zh', async (source) => {
    const container = await render(
      <ScrapedListingShell listing={{ ...listing, source }} similarListings={[]} />,
      'zh',
    );
    await click(container.querySelector('[data-testid="primary"]'));
    expect(openExternal).toHaveBeenCalledWith(listing.external_url);
    expect(container.ownerDocument.querySelector('[data-testid="sheet"]')).toBeNull();
  });
});
