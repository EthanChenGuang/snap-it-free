export type SourceRunDecision =
  | { action: 'run' }
  | { action: 'skipped'; message: string };

export function resolveSourceRun(source: {
  implementation_status: 'live' | 'coming_soon';
  enabled: boolean;
}): SourceRunDecision {
  if (!source.enabled) {
    return { action: 'skipped', message: 'Source disabled' };
  }
  if (source.implementation_status === 'coming_soon') {
    return { action: 'skipped', message: 'Coming soon — crawler not implemented' };
  }
  return { action: 'run' };
}
