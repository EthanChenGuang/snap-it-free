import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, select: mockSelect });
mockSelect.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });
mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'JWT rejected' } });

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

const mockGetOwnerListingStatusFromDb = vi.fn();
const mockUpdateOwnerListingStatusInDb = vi.fn();

vi.mock('@/lib/listings/owner-db', () => ({
  getOwnerListingStatusFromDb: (...args: unknown[]) => mockGetOwnerListingStatusFromDb(...args),
  updateOwnerListingStatusInDb: (...args: unknown[]) => mockUpdateOwnerListingStatusInDb(...args),
}));

describe('applyOwnerListingStatusUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'JWT rejected' } });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  });

  it('falls back to Postgres when PostgREST rejects the status update', async () => {
    mockUpdateOwnerListingStatusInDb.mockResolvedValue('expired');

    const { applyOwnerListingStatusUpdate } = await import('./patch-listing-status');
    const status = await applyOwnerListingStatusUpdate(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
      { status: 'expired' },
    );

    expect(status).toBe('expired');
    expect(mockUpdateOwnerListingStatusInDb).toHaveBeenCalledWith(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
      { status: 'expired' },
    );
  });

  it('resolveOwnerListingStatus falls back to Postgres when PostgREST read fails', async () => {
    mockGetOwnerListingStatusFromDb.mockResolvedValue('active');

    const { resolveOwnerListingStatus } = await import('./patch-listing-status');
    const status = await resolveOwnerListingStatus(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
    );

    expect(status).toBe('active');
    expect(mockGetOwnerListingStatusFromDb).toHaveBeenCalled();
  });
});
