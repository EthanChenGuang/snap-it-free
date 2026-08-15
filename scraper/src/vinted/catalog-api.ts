/**
 * Vinted catalog URL → /api/v2/catalog/items query-param mapping (Wave 0 spike field map).
 *
 * Vinted catalog URLs carry the category id in the path (`/catalog/{id}-{slug}`) plus
 * `order`/`currency` query params. The session-authenticated catalog items API is then
 * called with the mapped `catalog_ids` etc (D-17-36 verified).
 */
export function catalogUrlToApiParams(catalogUrl: string): URLSearchParams {
  const u = new URL(catalogUrl);
  const params = new URLSearchParams();
  params.set('per_page', '96');
  params.set('page', '1');
  params.set('order', u.searchParams.get('order') ?? 'newest_first');
  params.set('currency', 'EUR');

  let hasCatalogIds = false;
  for (const id of u.searchParams.getAll('catalog[]')) {
    params.append('catalog_ids', id);
    hasCatalogIds = true;
  }
  const pathMatch = u.pathname.match(/\/catalog\/(\d+)/);
  if (pathMatch && !hasCatalogIds) {
    params.set('catalog_ids', pathMatch[1]);
  }
  return params;
}
