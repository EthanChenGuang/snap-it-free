import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FeaturedPick } from '@/lib/featured/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { FeaturedStrip } from './FeaturedStrip';

function pick(i: number): FeaturedPick {
  return {
    id: `c${i}`,
    listing_id: `L${i}`,
    consumer_city: 'padova',
    studio_path: `d/L${i}.webp`,
    reviewed_at: '2026-11-08T09:00:00Z',
    title: `Sedia ${i}`,
    title_en: null,
    title_zh: `椅子 ${i}`,
    city: 'padova',
    category: null,
    imageUrl: `https://p.supabase.co/storage/v1/object/public/featured-photos/d/L${i}.webp`,
  };
}

describe('FeaturedStrip', () => {
  it('renders nothing for 0 picks', () => {
    expect(renderToStaticMarkup(<FeaturedStrip picks={[]} />)).toBe('');
  });

  it('renders one link per pick to /listing/{id} and the real count', () => {
    const html = renderToStaticMarkup(<FeaturedStrip picks={[pick(1), pick(2), pick(3)]} />);
    const hrefs = [...html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(['/listing/L1', '/listing/L2', '/listing/L3']);
    expect(html).toContain('今日精选');
    expect(html).toContain('店主每日挑选 · 3 件');
    expect(html).toContain('featured-photos/d/L1.webp');
  });

  it('keeps text out of the image frame', () => {
    const html = renderToStaticMarkup(<FeaturedStrip picks={[pick(1)]} />);
    const frame = html.match(/<div class="relative aspect-\[4\/5\][^"]*">([\s\S]*?)<\/div>/)?.[1] ?? '';
    expect(frame).not.toMatch(/<p|<h\d|<span[^>]*>[^<]+</);
    expect(html).toMatch(/loading="eager"/);
  });
});
