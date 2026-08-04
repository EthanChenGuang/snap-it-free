import { z } from 'zod';

export const PushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  locale: z.enum(['zh', 'en', 'it']).optional(),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;
