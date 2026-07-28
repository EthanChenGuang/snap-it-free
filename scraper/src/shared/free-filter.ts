const PRICE_PATTERNS = [
  /€\s*\d+/i,
  /\d+\s*€/i,
  /\beuro\b/i,
  /\bprezzo\b/i,
  /\btrattativa\b/i,
  /\bpagamento\b/i,
  /\bvend/i,
  /\ba pagamento\b/i,
  /\bnon gratis\b/i,
  /\d{2,}\s*(?:euro|€)/i,
];

export function isMislabeledFree(title: string, description?: string): string | null {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  for (const pattern of PRICE_PATTERNS) {
    if (pattern.test(text)) return `matched price pattern: ${pattern.source}`;
  }
  return null;
}
