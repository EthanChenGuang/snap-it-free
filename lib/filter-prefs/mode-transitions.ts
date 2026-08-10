import { clearBrowseCenter, writeBrowseCenter, type BrowseCenter } from '@/lib/browse-center/storage';
import {
  DEFAULT_FILTER_PREFS,
  readFilterPrefs,
  writeFilterPrefs,
  type FilterPrefs,
} from './storage';

/** City filter mode: clear map pin and disable radius. */
export function applyCityFilterPrefs(prefs: FilterPrefs): FilterPrefs {
  clearBrowseCenter();
  return writeFilterPrefs({
    ...prefs,
    mode: 'city',
    city: prefs.city,
    radiusEnabled: false,
    radiusKm: DEFAULT_FILTER_PREFS.radiusKm,
  });
}

/** Map + radius mode: persist pin, enable radius, reset city to All. */
export function applyMapFilterPrefs(
  center: BrowseCenter,
  radiusKm: number,
): FilterPrefs {
  writeBrowseCenter(center);
  const current = readFilterPrefs();
  return writeFilterPrefs({
    ...current,
    mode: 'map',
    city: 'all',
    radiusEnabled: true,
    radiusKm,
  });
}

/** Exit map mode (dismiss radius/center pill). */
export function clearMapFilterPrefs(): FilterPrefs {
  clearBrowseCenter();
  const current = readFilterPrefs();
  return writeFilterPrefs({
    ...current,
    mode: 'city',
    radiusEnabled: false,
    radiusKm: DEFAULT_FILTER_PREFS.radiusKm,
  });
}
