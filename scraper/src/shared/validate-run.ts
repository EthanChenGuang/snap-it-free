export function validateBatch(
  listings: unknown[],
  trailingMedians: number[],
  selectorHitRate: number,
  minCountRatio = 0.5,
  minSelectorRate = 0.9,
): { ok: true } | { ok: false; reason: string } {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length
    : 50;

  const minCount = Math.floor(median * minCountRatio);

  if (listings.length < minCount) {
    return {
      ok: false,
      reason: `count ${listings.length} < min ${minCount} (50% of median ${median})`,
    };
  }

  if (selectorHitRate < minSelectorRate) {
    return {
      ok: false,
      reason: `selector hit rate ${selectorHitRate} < ${minSelectorRate}`,
    };
  }

  return { ok: true };
}
