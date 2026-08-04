export type AntiBlockPreset = 'conservative' | 'standard' | 'aggressive';

export type CrawleePresetOptions = {
  maxPoolSize: number;
  maxRequestRetries: number;
  minConcurrency: number;
};

const PRESET_MAP: Record<AntiBlockPreset, CrawleePresetOptions> = {
  conservative: { maxPoolSize: 2, maxRequestRetries: 2, minConcurrency: 1 },
  standard: { maxPoolSize: 5, maxRequestRetries: 3, minConcurrency: 1 },
  aggressive: { maxPoolSize: 8, maxRequestRetries: 5, minConcurrency: 2 },
};

export function presetToCrawleeOptions(preset: AntiBlockPreset): CrawleePresetOptions {
  return { ...PRESET_MAP[preset] };
}

export function getMaxPoolSize(preset: AntiBlockPreset): number {
  return PRESET_MAP[preset].maxPoolSize;
}
