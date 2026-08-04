import { z } from 'zod';

export const antiBlockPresetSchema = z.enum(['conservative', 'standard', 'aggressive']);

export const SOURCE_SLUGS = ['subito', 'facebook', 'vinted', 'wallapop', 'ebay'] as const;

export const sourceSlugSchema = z.enum(SOURCE_SLUGS);

export const UpdateSourceSchema = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(30).max(1440).optional(),
  anti_block_preset: antiBlockPresetSchema.optional(),
  target_urls: z.array(z.string().url()).min(1).optional(),
});

export const UpdateGlobalConfigSchema = z.object({
  global_pause: z.boolean().optional(),
  auto_translate: z.boolean().optional(),
  daily_translation_cap: z.number().int().min(1).max(100_000).optional(),
});

export const CreateJobSchema = z.object({
  source_slug: sourceSlugSchema,
});

export const TranslationRetrySchema = z
  .object({
    listing_ids: z.array(z.string().uuid()).optional(),
    all_pending: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.listing_ids?.length) || value.all_pending === true, {
    message: 'Provide listing_ids or all_pending',
  });

export type UpdateSourceInput = z.infer<typeof UpdateSourceSchema>;
export type UpdateGlobalConfigInput = z.infer<typeof UpdateGlobalConfigSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type SourceSlug = (typeof SOURCE_SLUGS)[number];
