import { formatDistance } from '@/lib/geo/format-distance';

export type BuildCardMetadataInput = {
  distanceMeters: number | null | undefined;
  cityLabel: string;
  postedLabel: string;
  isClaimed: boolean;
  reservedLabel: string;
};

export function buildCardMetadata(input: BuildCardMetadataInput): string {
  const { distanceMeters, cityLabel, postedLabel, isClaimed, reservedLabel } = input;
  let base: string;
  if (distanceMeters != null) {
    base = `${formatDistance(distanceMeters)} · ${postedLabel}`;
  } else {
    base = [cityLabel, postedLabel].filter(Boolean).join(' · ');
  }
  if (isClaimed && reservedLabel) {
    return `${base} · ${reservedLabel}`;
  }
  return base;
}
