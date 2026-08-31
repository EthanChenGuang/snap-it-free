import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { proxy } from '../../proxy';
import { updateSession } from '../supabase/middleware';

vi.mock('../supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

vi.mock('./operator-access', () => ({
  hasOperatorAccessForUser: vi.fn(),
}));

function requestFor(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3003'));
}

describe('admin proxy auth redirect', () => {
  it('redirects unauthenticated visitors to the items list', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      response: NextResponse.next(),
      user: null,
      supabase: null,
    });

    const response = await proxy(requestFor('/admin/settings'));

    expect(response.headers.get('location')).toBe('http://localhost:3003/');
  });

  it('redirects authenticated non-operators to the items list', async () => {
    const { hasOperatorAccessForUser } = await import('./operator-access');
    vi.mocked(updateSession).mockResolvedValue({
      response: NextResponse.next(),
      user: { id: 'user-1', email: 'guest@example.com' } as never,
      supabase: {} as never,
    });
    vi.mocked(hasOperatorAccessForUser).mockResolvedValue(false);

    const response = await proxy(requestFor('/admin'));

    expect(response.headers.get('location')).toBe('http://localhost:3003/');
  });
});
