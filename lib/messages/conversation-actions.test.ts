import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

mockEq.mockReturnValue({
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  select: mockSelect,
  gt: mockEq,
});
mockSelect.mockReturnValue({
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  gt: mockEq,
});
mockInsert.mockReturnValue({ select: mockSelect });
mockFrom.mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
});
mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'JWT issued at future' } });
mockSingle.mockResolvedValue({ data: null, error: { message: 'JWT issued at future' } });
mockRpc.mockResolvedValue({ data: false, error: { message: 'JWT issued at future' } });

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const mockFindConversation = vi.fn();
const mockGetListing = vi.fn();
const mockFcfs = vi.fn();
const mockCountRecent = vi.fn();
const mockInsertConversation = vi.fn();
const mockFindByListing = vi.fn();
const mockInsertMessage = vi.fn();
const mockIsParticipant = vi.fn();
const mockListMessages = vi.fn();

vi.mock('@/lib/messages/conversations-db', () => ({
  findConversationByListingAndBuyerFromDb: (...args: unknown[]) => mockFindConversation(...args),
  findConversationByListingFromDb: (...args: unknown[]) => mockFindByListing(...args),
  getActiveUgcListingForMessagingFromDb: (...args: unknown[]) => mockGetListing(...args),
  listingHasOtherBuyerConversationFromDb: (...args: unknown[]) => mockFcfs(...args),
  countRecentConversationsByBuyerFromDb: (...args: unknown[]) => mockCountRecent(...args),
  insertConversationFromDb: (...args: unknown[]) => mockInsertConversation(...args),
  insertMessageFromDb: (...args: unknown[]) => mockInsertMessage(...args),
  isConversationParticipantFromDb: (...args: unknown[]) => mockIsParticipant(...args),
  listMessagesFromDb: (...args: unknown[]) => mockListMessages(...args),
  listConversationsForUserFromDb: vi.fn(async () => []),
  listMessagePreviewsForConversationsFromDb: vi.fn(async () => []),
  getConversationPageDataFromDb: vi.fn(async () => null),
}));

describe('startConversationForListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
      select: mockSelect,
      gt: mockEq,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
      gt: mockEq,
    });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'JWT issued at future' } });
    mockRpc.mockResolvedValue({ data: false, error: { message: 'JWT issued at future' } });
    mockFindConversation.mockResolvedValue(null);
    mockGetListing.mockResolvedValue({
      id: '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      owner_user_id: '11111111-1111-4111-8111-111111111111',
      source: 'ugc',
      status: 'active',
    });
    mockFcfs.mockResolvedValue(false);
    mockCountRecent.mockResolvedValue(0);
    mockInsertConversation.mockResolvedValue('22222222-2222-4222-8222-222222222222');
  });

  it('creates a conversation via Postgres when PostgREST rejects JWT', async () => {
    const { startConversationForListing } = await import('./conversation-actions');
    const result = await startConversationForListing(
      '541d432c-309d-4e11-b153-62f827fc16ec',
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
    );

    expect(result).toEqual({
      kind: 'created',
      id: '22222222-2222-4222-8222-222222222222',
    });
    expect(mockInsertConversation).toHaveBeenCalledWith(
      '637fea62-16f8-4f84-bce0-7ae7c02140b6',
      '541d432c-309d-4e11-b153-62f827fc16ec',
      '11111111-1111-4111-8111-111111111111',
    );
  });
});

describe('sendConversationMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'JWT issued at future' } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'JWT issued at future' } });
    mockIsParticipant.mockResolvedValue(true);
    mockInsertMessage.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      sender_id: '541d432c-309d-4e11-b153-62f827fc16ec',
      body: 'hello',
      created_at: '2026-09-06T12:00:00.000Z',
    });
  });

  it('inserts a message via Postgres when PostgREST rejects JWT', async () => {
    const { sendConversationMessage } = await import('./conversation-actions');
    const message = await sendConversationMessage(
      '541d432c-309d-4e11-b153-62f827fc16ec',
      '44444444-4444-4444-8444-444444444444',
      'hello',
    );

    expect(message).toMatchObject({ body: 'hello' });
    expect(mockInsertMessage).toHaveBeenCalledWith(
      '44444444-4444-4444-8444-444444444444',
      '541d432c-309d-4e11-b153-62f827fc16ec',
      'hello',
    );
  });
});
