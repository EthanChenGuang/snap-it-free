import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  countUnreadConversations,
  getConversationReadAt,
  INBOX_READ_STORAGE_KEY,
  isConversationUnread,
  markConversationRead,
} from './inbox-read-state';

const USER = 'user-1';
const OTHER = 'user-2';

describe('inbox-read-state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('treats incoming last message as unread when never opened', () => {
    expect(
      isConversationUnread(
        {
          id: 'c1',
          lastMessage: { createdAt: '2026-08-25T10:00:00Z', senderId: OTHER },
        },
        USER,
      ),
    ).toBe(true);
  });

  it('treats own last message as read', () => {
    expect(
      isConversationUnread(
        {
          id: 'c1',
          lastMessage: { createdAt: '2026-08-25T10:00:00Z', senderId: USER },
        },
        USER,
      ),
    ).toBe(false);
  });

  it('marks conversation read and ignores older messages', () => {
    markConversationRead('c1', '2026-08-25T11:00:00Z');
    expect(getConversationReadAt('c1')).toBe('2026-08-25T11:00:00Z');
    expect(
      isConversationUnread(
        {
          id: 'c1',
          lastMessage: { createdAt: '2026-08-25T10:00:00Z', senderId: OTHER },
        },
        USER,
      ),
    ).toBe(false);
  });

  it('counts unread conversations', () => {
    const count = countUnreadConversations(
      [
        {
          id: 'c1',
          lastMessage: { createdAt: '2026-08-25T10:00:00Z', senderId: OTHER },
        },
        {
          id: 'c2',
          lastMessage: { createdAt: '2026-08-25T10:00:00Z', senderId: USER },
        },
      ],
      USER,
    );
    expect(count).toBe(1);
  });

  it('persists read map in localStorage', () => {
    markConversationRead('c1', '2026-08-25T12:00:00Z');
    const raw = localStorage.getItem(INBOX_READ_STORAGE_KEY);
    expect(raw).toContain('c1');
  });
});
