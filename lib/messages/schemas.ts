import { z } from 'zod';

export const CreateConversationSchema = z.object({
  listingId: z.string().uuid(),
});

export const SendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
