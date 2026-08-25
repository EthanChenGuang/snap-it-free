import { NextResponse } from 'next/server';
import { fetchReverseGeocodeLabel } from '@/lib/geo/nominatim';
import { isValidAppLanguage } from '@/lib/user/locale';

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90);
  const lng = parseCoordinate(searchParams.get('lng'), -180, 180);
  const languageParam = searchParams.get('lang');

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const language = isValidAppLanguage(languageParam) ? languageParam : 'en';

  try {
    const label = await fetchReverseGeocodeLabel(lat, lng, language);
    if (!label) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }
    return NextResponse.json({ label });
  } catch {
    return NextResponse.json({ error: 'Reverse geocode failed' }, { status: 502 });
  }
}
