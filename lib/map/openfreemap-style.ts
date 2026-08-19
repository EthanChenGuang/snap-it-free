import type { FilterSpecification, Map as MapLibreMap } from 'maplibre-gl';

/** OpenFreeMap vector style used across the app. */
export const OPENFREEMAP_LIBERTY_STYLE_URL =
  'https://tiles.openfreemap.org/styles/liberty';

const REF_LENGTH_GET: FilterSpecification = ['get', 'ref_length'];

/**
 * OpenFreeMap Liberty compares `ref_length` in highway shield filters. Some
 * transportation_name features omit the property (null), which MapLibre 6 warns
 * about and treats as false.
 */
export function patchRefLengthNumericFilter(filter: unknown): unknown {
  if (!Array.isArray(filter)) return filter;

  if (
    filter.length === 3 &&
    filter[0] === '<=' &&
    Array.isArray(filter[1]) &&
    filter[1].length === 2 &&
    filter[1][0] === 'get' &&
    filter[1][1] === 'ref_length'
  ) {
    return ['<=', ['coalesce', REF_LENGTH_GET, 999], filter[2]];
  }

  return filter.map(patchRefLengthNumericFilter);
}

/** Apply style patches after the base OpenFreeMap style has loaded. */
export function patchOpenFreeMapStyle(map: MapLibreMap): void {
  for (const layer of map.getStyle().layers ?? []) {
    if (!('filter' in layer) || !layer.filter) continue;
    const patched = patchRefLengthNumericFilter(layer.filter);
    if (patched !== layer.filter) {
      map.setFilter(layer.id, patched as FilterSpecification);
    }
  }
}
