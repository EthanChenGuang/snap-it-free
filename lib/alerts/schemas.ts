import { z } from 'zod';
import { CONSUMER_CITY_KEYS, type ConsumerCityKey } from '@/lib/geo/italian-cities';
import type { VeniceZone } from '@/lib/listings/types';

export const veniceZoneSchema = z.enum([
  'centro_storico',
  'mestre_marghera',
  'lido_murano',
] satisfies [VeniceZone, VeniceZone, VeniceZone]);

export const consumerCityKeySchema = z.enum(
  CONSUMER_CITY_KEYS as unknown as [ConsumerCityKey, ...ConsumerCityKey[]],
);

export type AlertRow = {
  id: string;
  keyword: string | null;
  zone: VeniceZone | null;
  city: ConsumerCityKey | null;
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
    city: consumerCityKeySchema.nullable().optional(),
  })
  .refine(
    (data) => {
      const hasKeyword = data.keyword != null && data.keyword.length > 0;
      const hasZone = data.zone != null;
      const hasCity = data.city != null;
      return hasKeyword || hasZone || hasCity;
    },
    { message: 'At least one of keyword, zone, or city is required' },
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
  city: consumerCityKeySchema.nullable().optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type UpdateAlertInput = z.infer<typeof UpdateAlertSchema>;

export function alertHasKeywordOrLocation(
  keyword: string | null | undefined,
  zone: VeniceZone | null | undefined,
  city: ConsumerCityKey | null | undefined,
): boolean {
  const hasKeyword = keyword != null && keyword.length > 0;
  const hasZone = zone != null;
  const hasCity = city != null;
  return hasKeyword || hasZone || hasCity;
}

/** @deprecated Use alertHasKeywordOrLocation */
export function alertHasKeywordOrZone(
  keyword: string | null | undefined,
  zone: VeniceZone | null | undefined,
): boolean {
  return alertHasKeywordOrLocation(keyword, zone, null);
}
