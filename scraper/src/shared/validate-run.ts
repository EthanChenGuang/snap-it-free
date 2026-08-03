export function validateBatch(
  listings: unknown[],
  trailingMedians: number[],
  selectorHitRate: number,
  minCountRatio = 0.5,
  minSelectorRate = 0.9,
  geoResolutionRate?: number,
  minGeoResolutionRate?: number,
): { ok: true } | { ok: false; reason: string } {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length
    : 50;

  const minCount = Math.floor(median * minCountRatio);

  if (listings.length < minCount) {
    return {
      ok: false,
      reason: `count ${listings.length} < min ${minCount} (${Math.round(minCountRatio * 100)}% of median ${median})`,
    };
  }

  if (selectorHitRate < minSelectorRate) {
    return {
      ok: false,
      reason: `selector hit rate ${selectorHitRate} < ${minSelectorRate}`,
    };
  }

  if (
    typeof geoResolutionRate === 'number' &&
    typeof minGeoResolutionRate === 'number' &&
    geoResolutionRate < minGeoResolutionRate
  ) {
    return {
      ok: false,
      reason: `geo resolution rate ${geoResolutionRate.toFixed(2)} < ${minGeoResolutionRate}`,
    };
  }

  return { ok: true };
}
