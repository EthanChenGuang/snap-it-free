import { describe, expect, it } from 'vitest';
import { CreateConversationSchema, SendMessageSchema } from './schemas';

describe('CreateConversationSchema', () => {
  it('requires listingId UUID', () => {
    expect(CreateConversationSchema.safeParse({ listingId: 'not-a-uuid' }).success).toBe(false);
    expect(
      CreateConversationSchema.safeParse({
        listingId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
  });
});

describe('SendMessageSchema', () => {
  it('rejects empty body', () => {
    expect(SendMessageSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(SendMessageSchema.safeParse({ body: '' }).success).toBe(false);
  });

  it('rejects body over 2000 chars', () => {
    expect(SendMessageSchema.safeParse({ body: 'a'.repeat(2001) }).success).toBe(false);
    expect(SendMessageSchema.safeParse({ body: 'a'.repeat(2000) }).success).toBe(true);
  });
});
