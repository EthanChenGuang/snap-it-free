export const INBOX_READ_STORAGE_KEY = 'shoumanwu_inbox_read_at';
export const INBOX_READ_CHANGE_EVENT = 'shoumanwu_inbox_read_change';

type ReadMap = Record<string, string>;

export type InboxConversationPreview = {
  id: string;
  lastMessage: {
    createdAt: string;
    senderId: string;
  } | null;
};

function readMap(): ReadMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INBOX_READ_STORAGE_KEY);
    if (!raw?.trim()) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ReadMap;
  } catch {
    return {};
  }
}

function writeMap(map: ReadMap) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(INBOX_READ_STORAGE_KEY, JSON.stringify(map));
}

export function getConversationReadAt(conversationId: string): string | null {
  return readMap()[conversationId] ?? null;
}

export function markConversationRead(conversationId: string, readAt = new Date().toISOString()) {
  if (typeof window === 'undefined') return;
  const map = readMap();
  map[conversationId] = readAt;
  writeMap(map);
  window.dispatchEvent(new Event(INBOX_READ_CHANGE_EVENT));
}

export function isConversationUnread(
  conversation: InboxConversationPreview,
  userId: string,
): boolean {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage || lastMessage.senderId === userId) {
    return false;
  }

  const readAt = getConversationReadAt(conversation.id);
  if (!readAt) {
    return true;
  }

  return new Date(lastMessage.createdAt).getTime() > new Date(readAt).getTime();
}

export function countUnreadConversations(
  conversations: InboxConversationPreview[],
  userId: string,
): number {
  return conversations.filter((conversation) => isConversationUnread(conversation, userId)).length;
}
