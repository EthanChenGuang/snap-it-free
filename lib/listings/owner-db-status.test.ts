import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/supabase/postgres', () => ({
  getListingsPool: () => ({ query: mockQuery }),
}));

describe('owner listing status db helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOwnerListingStatusFromDb returns status when row exists', async () => {
    mockQuery.mockResolvedValue({ rows: [{ status: 'active' }] });

    const { getOwnerListingStatusFromDb } = await import('./owner-db');
    const status = await getOwnerListingStatusFromDb(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
    );

    expect(status).toBe('active');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('select status'),
      ['637fea62-16f8-4f84-bce0-7ae7c02140b6', '541d432c-309d-4e11-b153-62f827fc16ec'],
    );
  });

  it('updateOwnerListingStatusInDb sets reserved_at for claimed transition', async () => {
    mockQuery.mockResolvedValue({ rows: [{ status: 'claimed' }] });

    const { updateOwnerListingStatusInDb } = await import('./owner-db');
    const status = await updateOwnerListingStatusInDb(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
      { status: 'claimed', reserved_at: '2026-09-06T12:00:00.000Z' },
    );

    expect(status).toBe('claimed');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('reserved_at = $4'),
      [
        '637fea62-16f8-4f84-bce0-7ae7c02140b6',
        '541d432c-309d-4e11-b153-62f827fc16ec',
        'claimed',
        '2026-09-06T12:00:00.000Z',
      ],
    );
  });

  it('updateOwnerListingStatusInDb marks listing expired without reserved_at', async () => {
    mockQuery.mockResolvedValue({ rows: [{ status: 'expired' }] });

    const { updateOwnerListingStatusInDb } = await import('./owner-db');
    const status = await updateOwnerListingStatusInDb(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
      { status: 'expired' },
    );

    expect(status).toBe('expired');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('update public.listings'),
      [
        '637fea62-16f8-4f84-bce0-7ae7c02140b6',
        '541d432c-309d-4e11-b153-62f827fc16ec',
        'expired',
      ],
    );
  });
});
