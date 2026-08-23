import { z } from 'zod';

export const antiBlockPresetSchema = z.enum(['conservative', 'standard', 'aggressive']);

export const SOURCE_SLUGS = ['subito', 'facebook', 'vinted', 'wallapop', 'ebay'] as const;

export const sourceSlugSchema = z.enum(SOURCE_SLUGS);

export const UpdateSourceSchema = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().int().min(30).max(1440).optional(),
  anti_block_preset: antiBlockPresetSchema.optional(),
  target_urls: z.array(z.string().url()).min(1).optional(),
  use_proxy_url: z.boolean().optional(),
  /** Operator Facebook cookie JSON — encrypted to session_enc on PATCH (D-18-10/11). */
  session_json: z.string().max(65536).optional(),
});

export const TestFacebookSessionSchema = z.object({
  session_json: z.string().min(1).max(65536),
});

export const translationProviderSchema = z.enum(['gemini', 'openrouter']);

export const crawlModeSchema = z.enum(['incremental', 'full']);

export const UpdateGlobalConfigSchema = z.object({
  global_pause: z.boolean().optional(),
  auto_translate: z.boolean().optional(),
  daily_translation_cap: z.number().int().min(1).max(100_000).optional(),
  translation_provider: translationProviderSchema.optional(),
  proxy_url: z.string().url().optional(),
  telegram_chat_id: z.string().max(128).nullable().optional(),
  alert_email: z.union([z.string().email(), z.literal('')]).nullable().optional(),
  early_stop_k: z.number().int().min(1).max(50).optional(),
  full_refresh_hours: z.number().int().min(1).max(168).optional(),
  max_pages: z.number().int().min(1).max(3).optional(),
});

export const CreateJobSchema = z.object({
  source_slug: sourceSlugSchema,
  crawl_mode: crawlModeSchema.default('incremental'),
});

export const TranslationRetrySchema = z
  .object({
    listing_ids: z.array(z.string().uuid()).optional(),
    all_pending: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.listing_ids?.length) || value.all_pending === true, {
    message: 'Provide listing_ids or all_pending',
  });

export const ExecuteCleanupSchema = z.object({
  confirm: z.literal(true),
});

/** Full Subito regalo matrix is 17 categories × 9 cities = 153 URLs. */
export const VALIDATE_TARGET_URLS_MAX = 200;

export const ValidateTargetUrlsSchema = z.object({
  urls: z.array(z.string()).min(1).max(VALIDATE_TARGET_URLS_MAX),
  probe: z.boolean().default(true),
});

export type UpdateSourceInput = z.infer<typeof UpdateSourceSchema>;
export type UpdateGlobalConfigInput = z.infer<typeof UpdateGlobalConfigSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type SourceSlug = (typeof SOURCE_SLUGS)[number];
