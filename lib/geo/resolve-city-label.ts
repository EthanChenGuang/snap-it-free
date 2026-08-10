export const VENICE_CENTER = { lat: 45.44, lng: 12.33 };

export function resolveCityLabel(
  lat: number,
  lng: number,
  cityLabels: { venice: string; padova: string },
): string {
  const padovaCenter = { lat: 45.41, lng: 11.88 };
  const padovaDist =
    (lat - padovaCenter.lat) ** 2 + (lng - padovaCenter.lng) ** 2;
  const veniceDist =
    (lat - VENICE_CENTER.lat) ** 2 + (lng - VENICE_CENTER.lng) ** 2;
  return padovaDist < veniceDist ? cityLabels.padova : cityLabels.venice;
}
