'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  generateWallapopSearchUrls,
  mergeGeneratedWallapopUrls,
  WALLAPOP_CITY_LABELS,
  WALLAPOP_SEARCH_DEFAULTS,
  WALLAPOP_SEED_CITY_SLUGS,
  type WallapopSeedCitySlug,
} from '@/lib/admin/wallapop-search-catalog';
import { cn } from '@/lib/utils';

const ALL_CITIES = WALLAPOP_SEED_CITY_SLUGS;

function defaultCityState(): Record<WallapopSeedCitySlug, boolean> {
  return Object.fromEntries(ALL_CITIES.map((city) => [city, true])) as Record<
    WallapopSeedCitySlug,
    boolean
  >;
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
        'inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-all',
        selected
          ? 'border-blue-200/80 bg-blue-50 font-semibold text-blue-600 shadow-[0_1px_2px_rgba(0,122,255,0.08)]'
          : 'border-transparent bg-gray-100/80 text-gray-600 hover:bg-gray-200/60',
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

export type WallapopUrlMatrixProps = {
  targetUrlsText: string;
  onTargetUrlsChange: (text: string) => void;
  onApplyRecommendedSeedClick: () => void;
  resetToAllChecked?: number;
};

export function WallapopUrlMatrix({
  targetUrlsText,
  onTargetUrlsChange,
  onApplyRecommendedSeedClick,
  resetToAllChecked = 0,
}: WallapopUrlMatrixProps) {
  const [cities, setCities] = useState(defaultCityState);

  const selectedCities = useMemo(
    () => ALL_CITIES.filter((city) => cities[city]),
    [cities],
  );
  const selectedCount = selectedCities.length;

  const handleGenerate = () => {
    const generated = generateWallapopSearchUrls(selectedCities);
    onTargetUrlsChange(mergeGeneratedWallapopUrls(generated, targetUrlsText).join('\n'));
  };

  useEffect(() => {
    if (resetToAllChecked > 0) {
      setCities(defaultCityState());
    }
  }, [resetToAllChecked]);

  return (
    <section className="source-detail-card">
      <header className="source-detail-card-header">
        <div>
          <h2 className="source-detail-card-title">Wallapop 城市矩阵</h2>
          <p className="source-detail-card-subtitle">
            按城市生成 €0 搜索 URL（半径 {WALLAPOP_SEARCH_DEFAULTS.distanceInKm} km，Playwright 抓取）。
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
                {WALLAPOP_CITY_LABELS[city]}
              </SelectionChip>
            ))}
          </div>
        </div>
      </div>

      <div className="source-detail-matrix-footer">
        <p className="source-detail-matrix-meta tabular-nums">
          {selectedCount} URLs selected · Template: /search?max_sale_price=0&amp;latitude=…&amp;longitude=…
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

      {selectedCount >= 10 ? (
        <div className="source-detail-inline-banner source-detail-inline-banner-warning">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            warning
          </span>
          <p>
            已选 {selectedCount} 个城市，Playwright 抓取耗时较长。建议使用「保守」或「标准」防封策略。
          </p>
        </div>
      ) : null}
    </section>
  );
}
