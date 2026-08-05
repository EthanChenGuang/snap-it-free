'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  SUBITO_REGALO_CATALOG,
  dedupeUrls,
  generateRegaloUrls,
  type SubitoRegaloCity,
} from '@/lib/admin/subito-regalo-catalog';

const ALL_CITIES: SubitoRegaloCity[] = ['venezia', 'padova'];
const ALL_SLUGS = SUBITO_REGALO_CATALOG.map((entry) => entry.slug);

function defaultCityState(): Record<SubitoRegaloCity, boolean> {
  return { venezia: true, padova: true };
}

function defaultCategoryState(): Record<string, boolean> {
  return Object.fromEntries(ALL_SLUGS.map((slug) => [slug, true]));
}

export type RegaloUrlMatrixProps = {
  targetUrlsText: string;
  onTargetUrlsChange: (text: string) => void;
  /** Parent handles empty textarea vs confirm modal (D-14). */
  onApplyRecommendedSeedClick: () => void;
  /** Increment after seed replace to sync matrix to all checked. */
  resetToAllChecked?: number;
};

export function RegaloUrlMatrix({
  targetUrlsText,
  onTargetUrlsChange,
  onApplyRecommendedSeedClick,
  resetToAllChecked = 0,
}: RegaloUrlMatrixProps) {
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
    const generated = dedupeUrls(generateRegaloUrls(selectedCities, selectedSlugs));
    const generatedSet = new Set(generated);
    const manualLines = targetUrlsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !generatedSet.has(line));
    onTargetUrlsChange([...generated, ...manualLines].join('\n'));
  };

  const handleSelectAllCategories = () => {
    setCategories(defaultCategoryState());
  };

  const handleClearCategories = () => {
    setCategories(Object.fromEntries(ALL_SLUGS.map((slug) => [slug, false])));
  };

  // Sync matrix when parent applies recommended seed (D-14 confirm).
  useEffect(() => {
    if (resetToAllChecked > 0) {
      setCities(defaultCityState());
      setCategories(defaultCategoryState());
    }
  }, [resetToAllChecked]);

  return (
    <div className="space-y-4 border-b border-outline-variant pb-4">
      <div>
        <h3 className="font-semibold">Regalo URL 矩阵</h3>
        <p className="mt-1 text-[14px] text-secondary">
          根据 Veneto 城市与 regalo 分类生成目标 URL。
        </p>
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-low p-4">
        <div className="mb-4">
          <div className="mb-2 text-[14px] font-semibold">城市</div>
          <div className="flex flex-wrap gap-4">
            {ALL_CITIES.map((city) => (
              <label key={city} className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={cities[city]}
                  onChange={(event) =>
                    setCities((prev) => ({ ...prev, [city]: event.target.checked }))
                  }
                  className="rounded border-outline-variant text-primary accent-primary focus:ring-primary"
                />
                <span className="text-[14px] capitalize">{city === 'venezia' ? 'Venezia' : 'Padova'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[14px] font-semibold">分类</div>
            <div className="flex items-center gap-2 text-[14px] text-secondary">
              <button
                type="button"
                onClick={handleSelectAllCategories}
                className="underline hover:text-on-surface"
              >
                全选分类
              </button>
              <span className="text-outline-variant" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={handleClearCategories}
                className="underline hover:text-on-surface"
              >
                清空分类
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            {SUBITO_REGALO_CATALOG.map((entry) => (
              <label key={entry.slug} className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={categories[entry.slug] ?? false}
                  onChange={(event) =>
                    setCategories((prev) => ({
                      ...prev,
                      [entry.slug]: event.target.checked,
                    }))
                  }
                  className="rounded border-outline-variant text-primary accent-primary focus:ring-primary"
                />
                <span
                  title={entry.slug}
                  className={`truncate text-[14px] ${entry.slug === 'usato' ? 'font-medium' : ''}`}
                >
                  {entry.labelIt}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[14px] text-secondary">
          {selectedCount} URLs selected · Template: /annunci-veneto/regalo/&#123;slug&#125;/&#123;city&#125;/&#123;city&#125;/
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded border border-outline-variant px-4 py-2 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            生成 URL
          </button>
          <button
            type="button"
            onClick={onApplyRecommendedSeedClick}
            className="rounded bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:opacity-90"
          >
            应用推荐种子
          </button>
        </div>
      </div>

      {selectedCount >= 30 ? (
        <div className="flex items-start gap-2 rounded bg-[#f1f1f0] px-4 py-2 text-amber-700">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            warning
          </span>
          <span className="text-[14px]">
            {selectedCount} URLs selected — expect a longer scrape run. Anti-block Standard preset
            recommended.
          </span>
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded bg-surface-container-low px-4 py-2">
        <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden>
          info
        </span>
        <span className="text-[14px] text-secondary">
          更多意大利大区即将支持 — URL 模板亦支持 annunci-&#123;region&#125;/regalo/…
        </span>
      </div>
    </div>
  );
}
