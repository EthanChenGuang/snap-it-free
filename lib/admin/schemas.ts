import { z } from 'zod';

export const antiBlockPresetSchema = z.enum(['conservative', 'standard', 'aggressive']);

export const UpdateSourceSchema = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(30).max(1440).optional(),
  anti_block_preset: antiBlockPresetSchema.optional(),
  target_urls: z.array(z.string().url()).min(1).optional(),
});

export type UpdateSourceInput = z.infer<typeof UpdateSourceSchema>;
