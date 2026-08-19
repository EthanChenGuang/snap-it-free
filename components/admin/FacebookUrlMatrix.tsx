'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildDefaultFacebookUrl,
  FACEBOOK_SEARCH_QUERIES,
  FACEBOOK_SEED_CITY_SLUGS,
  type FacebookSearchQuery,
  type FacebookSeedCitySlug,
} from '@/lib/admin/facebook-recommended-seed';
import { dedupeUrls, ITALIAN_CITIES } from '@/lib/admin/subito-regalo-catalog';
import { cn } from '@/lib/utils';

const ALL_CITIES = FACEBOOK_SEED_CITY_SLUGS;
const ALL_QUERIES = FACEBOOK_SEARCH_QUERIES;

const CITY_LABELS = Object.fromEntries(
  ITALIAN_CITIES.map((city) => [city.consumerKey, city.labelIt]),
) as Record<FacebookSeedCitySlug, string>;

const QUERY_LABELS: Record<FacebookSearchQuery, string> = {
  gratis: 'gratis',
  regalo: 'regalo',
  free: 'free',
};

function defaultCityState(): Record<FacebookSeedCitySlug, boolean> {
  return Object.fromEntries(ALL_CITIES.map((city) => [city, true])) as Record<
    FacebookSeedCitySlug,
    boolean
  >;
}

function defaultQueryState(): Record<FacebookSearchQuery, boolean> {
  return Object.fromEntries(ALL_QUERIES.map((query) => [query, true])) as Record<
    FacebookSearchQuery,
    boolean
  >;
}

function generateFacebookUrls(
  cities: readonly FacebookSeedCitySlug[],
  queries: readonly FacebookSearchQuery[],
): string[] {
  const urls: string[] = [];
  for (const city of cities) {
    for (const query of queries) {
      urls.push(buildDefaultFacebookUrl(city, query));
    }
  }
  return urls;
}

function mergeGeneratedFacebookUrls(generated: string[], existingText: string): string[] {
  const generatedSet = new Set(
    ALL_CITIES.flatMap((city) => ALL_QUERIES.map((query) => buildDefaultFacebookUrl(city, query))),
  );

  const manualLines = existingText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !generatedSet.has(line));

  return dedupeUrls([...generated, ...manualLines]);
}

function SelectionChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-3 py-1 text-xs font-medium transition-colors',
        selected
          ? 'border-outline-variant bg-[#f1f1f0] font-semibold text-on-surface'
          : 'border-transparent bg-surface-container-high text-secondary hover:bg-surface-container',
      )}
    >
      {selected ? (
        <span className="material-symbols-outlined text-[14px]" aria-hidden>
          check
        </span>
      ) : null}
      {children}
    </button>
  );
}

export type FacebookUrlMatrixProps = {
  targetUrlsText: string;
  onTargetUrlsChange: (text: string) => void;
  onApplyRecommendedSeedClick: () => void;
  resetToAllChecked?: number;
};

export function FacebookUrlMatrix({
  targetUrlsText,
  onTargetUrlsChange,
  onApplyRecommendedSeedClick,
  resetToAllChecked = 0,
}: FacebookUrlMatrixProps) {
  const [cities, setCities] = useState(defaultCityState);
  const [queries, setQueries] = useState(defaultQueryState);

  const selectedCities = useMemo(
    () => ALL_CITIES.filter((city) => cities[city]),
    [cities],
  );
  const selectedQueries = useMemo(
    () => ALL_QUERIES.filter((query) => queries[query]),
    [queries],
  );
  const selectedCount = selectedCities.length * selectedQueries.length;

  const handleGenerate = () => {
    const generated = dedupeUrls(generateFacebookUrls(selectedCities, selectedQueries));
    onTargetUrlsChange(mergeGeneratedFacebookUrls(generated, targetUrlsText).join('\n'));
  };

  const handleSelectAllQueries = () => {
    setQueries(defaultQueryState());
  };

  const handleClearQueries = () => {
    setQueries(Object.fromEntries(ALL_QUERIES.map((query) => [query, false])) as Record<
      FacebookSearchQuery,
      boolean
    >);
  };

  useEffect(() => {
    if (resetToAllChecked > 0) {
      setCities(defaultCityState());
      setQueries(defaultQueryState());
    }
  }, [resetToAllChecked]);

  return (
    <section className="source-detail-card">
      <header className="source-detail-card-header">
        <div>
          <h2 className="source-detail-card-title">Facebook URL 矩阵</h2>
          <p className="source-detail-card-subtitle">
            按城市与搜索词生成 Marketplace 搜索 URL。与 Subito 矩阵使用相同的 9 城（Venezia 路径 slug 为{' '}
            <code className="text-xs">venice</code>）。
          </p>
        </div>
      </header>

      <div className="source-detail-matrix-panel">
        <div className="source-detail-matrix-section">
          <div className="source-detail-matrix-label">城市</div>
          <div className="source-detail-chip-row">
            {ALL_CITIES.map((city) => (
              <SelectionChip
                key={city}
                selected={cities[city]}
                onClick={() => setCities((prev) => ({ ...prev, [city]: !prev[city] }))}
              >
                {CITY_LABELS[city]}
              </SelectionChip>
            ))}
          </div>
        </div>

        <div className="source-detail-matrix-section">
          <div className="source-detail-matrix-label-row">
            <div className="source-detail-matrix-label">搜索词</div>
            <div className="source-detail-text-actions">
              <button type="button" onClick={handleSelectAllQueries}>
                全选
              </button>
              <span aria-hidden>·</span>
              <button type="button" onClick={handleClearQueries}>
                清空
              </button>
            </div>
          </div>
          <div className="source-detail-chip-row">
            {ALL_QUERIES.map((query) => (
              <SelectionChip
                key={query}
                selected={queries[query]}
                onClick={() => setQueries((prev) => ({ ...prev, [query]: !prev[query] }))}
              >
                {QUERY_LABELS[query]}
              </SelectionChip>
            ))}
          </div>
        </div>
      </div>

      <div className="source-detail-matrix-footer">
        <p className="source-detail-matrix-meta tabular-nums">
          {selectedCount} URLs selected · Template: /marketplace/&#123;city&#125;/search/?query=&#123;gratis|regalo|free&#125;
        </p>
        <div className="source-detail-matrix-actions">
          <button type="button" onClick={handleGenerate} className="source-detail-btn-secondary">
            生成 URL
          </button>
          <button
            type="button"
            onClick={onApplyRecommendedSeedClick}
            className="source-detail-btn-primary"
          >
            应用推荐种子
          </button>
        </div>
      </div>
    </section>
  );
}
