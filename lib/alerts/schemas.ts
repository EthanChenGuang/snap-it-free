import { z } from 'zod';
import type { VeniceZone } from '@/lib/listings/types';

export const veniceZoneSchema = z.enum([
  'centro_storico',
  'mestre_marghera',
  'lido_murano',
] satisfies [VeniceZone, VeniceZone, VeniceZone]);

export type AlertRow = {
  id: string;
  keyword: string | null;
  zone: VeniceZone | null;
  enabled: boolean;
  created_at: string;
};

export const CreateAlertSchema = z
  .object({
    keyword: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    zone: veniceZoneSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      const hasKeyword = data.keyword != null && data.keyword.length > 0;
      const hasZone = data.zone != null;
      return hasKeyword || hasZone;
    },
    { message: 'At least one of keyword or zone is required' },
  );

export const UpdateAlertSchema = z.object({
  enabled: z.boolean().optional(),
  keyword: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value)),
  zone: veniceZoneSchema.nullable().optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type UpdateAlertInput = z.infer<typeof UpdateAlertSchema>;

export function alertHasKeywordOrZone(keyword: string | null | undefined, zone: VeniceZone | null | undefined): boolean {
  const hasKeyword = keyword != null && keyword.length > 0;
  const hasZone = zone != null;
  return hasKeyword || hasZone;
}
