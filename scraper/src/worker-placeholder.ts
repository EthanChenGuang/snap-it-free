export type SourceRunDecision =
  | { action: 'run' }
  | { action: 'skipped'; message: string };

export function resolveSourceRun(
  source: {
    implementation_status: 'live' | 'coming_soon';
    enabled: boolean;
  },
  options?: { manual?: boolean },
): SourceRunDecision {
  if (source.implementation_status === 'coming_soon') {
    return { action: 'skipped', message: 'Coming soon — crawler not implemented' };
  }
  if (!source.enabled && !options?.manual) {
    return { action: 'skipped', message: 'Source disabled' };
  }
  return { action: 'run' };
}
