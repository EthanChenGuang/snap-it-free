export type BuildCardMetadataInput = {
  postedLabel: string;
  isClaimed: boolean;
  reservedLabel: string;
};

export function buildCardMetadata(input: BuildCardMetadataInput): string {
  const { postedLabel, isClaimed, reservedLabel } = input;
  if (isClaimed && reservedLabel) {
    return `${postedLabel} · ${reservedLabel}`;
  }
  return postedLabel;
}
