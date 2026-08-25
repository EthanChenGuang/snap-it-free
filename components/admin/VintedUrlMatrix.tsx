'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  SUBITO_REGALO_CATALOG,
  dedupeUrls,
  ITALIAN_CITIES,
  SUBITO_CITY_SLUGS,
  type SubitoRegaloSlug,
  type SubitoRegaloCity,
} from '@/lib/admin/subito-regalo-catalog';
import {
  buildDefaultVintedUrl,
  type VintedSeedCitySlug,
} from '@/lib/admin/vinted-recommended-seed';
import { cn } from '@/lib/utils';

const ALL_CITIES = SUBITO_CITY_SLUGS;
const ALL_SLUGS = SUBITO_REGALO_CATALOG.map((entry) => entry.slug);

const CITY_LABELS = Object.fromEntries(
  ITALIAN_CITIES.map((city) => [city.subitoSlug, city.labelIt]),
) as Record<SubitoRegaloCity, string>;

function defaultCityState(): Record<VintedSeedCitySlug, boolean> {
  return Object.fromEntries(ALL_CITIES.map((city) => [city, true])) as Record<
    VintedSeedCitySlug,
    boolean
  >;
}

function defaultCategoryState(): Record<string, boolean> {
  return Object.fromEntries(ALL_SLUGS.map((slug) => [slug, true]));
}

function generateVintedUrls(
  cities: readonly VintedSeedCitySlug[],
  slugs: readonly string[],
): string[] {
  const urls: string[] = [];
  for (const city of cities) {
    for (const slug of slugs) {
      urls.push(buildDefaultVintedUrl(slug as SubitoRegaloSlug, city));
    }
  }
  return urls;
}

/** Keep manual lines that are not generated Vinted catalog templates. */
function mergeGeneratedVintedUrls(generated: string[], existingText: string): string[] {
  const generatedSet = new Set(
    ALL_CITIES.flatMap((city) =>
      ALL_SLUGS.map((slug) => buildDefaultVintedUrl(slug as SubitoRegaloSlug, city)),
    ),
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
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-all',
        selected
          ? 'border-blue-200/80 bg-blue-50 font-semibold text-blue-600 shadow-[0_1px_2px_rgba(0,122,255,0.08)]'
          : 'border-transparent bg-gray-100/80 text-gray-600 hover:bg-gray-200/60',
        className,
      )}
    >
      {selected ? (
        <span className="text-[10px] leading-none" aria-hidden>
          ✓
        </span>
      ) : null}
      {children}
    </button>
  );
}

export type VintedUrlMatrixProps = {
  targetUrlsText: string;
  onTargetUrlsChange: (text: string) => void;
  onApplyRecommendedSeedClick: () => void;
  resetToAllChecked?: number;
};

export function VintedUrlMatrix({
  targetUrlsText,
  onTargetUrlsChange,
  onApplyRecommendedSeedClick,
  resetToAllChecked = 0,
}: VintedUrlMatrixProps) {
  const [cities, setCities] = useState(defaultCityState);
  const [categories, setCategories] = useState(defaultCategoryState);

  const selectedCities = useMemo(
    () => ALL_CITIES.filter((city) => cities[city]),
    [cities],
  );
  const selectedSlugs = useMemo(
    () => ALL_SLUGS.filter((slug) => categories[slug]),
    [categories],
  );
  const selectedCount = selectedCities.length * selectedSlugs.length;

  const handleGenerate = () => {
    const generated = dedupeUrls(generateVintedUrls(selectedCities, selectedSlugs));
    onTargetUrlsChange(mergeGeneratedVintedUrls(generated, targetUrlsText).join('\n'));
  };

  const handleSelectAllCategories = () => {
    setCategories(defaultCategoryState());
  };

  const handleClearCategories = () => {
    setCategories(Object.fromEntries(ALL_SLUGS.map((slug) => [slug, false])));
  };

  useEffect(() => {
    if (resetToAllChecked > 0) {
      setCities(defaultCityState());
      setCategories(defaultCategoryState());
    }
  }, [resetToAllChecked]);

  return (
    <section className="source-detail-card">
      <header className="source-detail-card-header">
        <div>
          <h2 className="source-detail-card-title">Vinted URL 矩阵</h2>
          <p className="source-detail-card-subtitle">
            按城市与 Subito 分类生成 Vinted catalog URL；城市范围通过{' '}
            <code className="text-xs">?city=</code> 元数据标记（D-17-06）。与 Subito 矩阵使用相同的 13 城。
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
                onClick={() =>
                  setCities((prev) => ({ ...prev, [city]: !prev[city] }))
                }
              >
                {CITY_LABELS[city]}
              </SelectionChip>
            ))}
          </div>
        </div>

        <div className="source-detail-matrix-section">
          <div className="source-detail-matrix-label-row">
            <div className="source-detail-matrix-label">分类</div>
            <div className="source-detail-text-actions">
              <button type="button" onClick={handleSelectAllCategories}>
                全选
              </button>
              <span aria-hidden>·</span>
              <button type="button" onClick={handleClearCategories}>
                清空
              </button>
            </div>
          </div>
          <div className="source-detail-chip-row">
            {SUBITO_REGALO_CATALOG.map((entry) => (
              <SelectionChip
                key={entry.slug}
                selected={categories[entry.slug] ?? false}
                onClick={() =>
                  setCategories((prev) => ({
                    ...prev,
                    [entry.slug]: !prev[entry.slug],
                  }))
                }
                className={entry.slug === 'usato' ? 'font-medium' : undefined}
              >
                {entry.labelIt}
              </SelectionChip>
            ))}
          </div>
        </div>
      </div>

      <div className="source-detail-matrix-footer">
        <p className="source-detail-matrix-meta tabular-nums">
          {selectedCount} URLs selected · Template: /catalog/&#123;id&#125;-slug?order=newest_first&amp;city=&#123;city&#125;
        </p>
        <div className="source-detail-matrix-actions">
          <button
            type="button"
            onClick={handleGenerate}
            className="source-detail-btn-secondary"
          >
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

      {selectedCount >= 30 ? (
        <div className="source-detail-inline-banner source-detail-inline-banner-warning">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            warning
          </span>
          <p>
            已选 {selectedCount} 个 URL，抓取耗时可能较长。建议使用「标准」防封策略。
          </p>
        </div>
      ) : null}
    </section>
  );
}
