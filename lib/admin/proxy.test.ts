import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { proxy } from '../../proxy';
import { updateSession } from '../supabase/middleware';

vi.mock('../supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

vi.mock('./operator-access', () => ({
  hasOperatorAccess: vi.fn(),
}));

function requestFor(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3003'));
}

describe('admin proxy auth redirect', () => {
  it('preserves the requested admin path in next parameter', async () => {
    vi.mocked(updateSession).mockResolvedValue({
      response: NextResponse.next(),
      user: null,
      supabase: null,
    });

    const response = await proxy(requestFor('/admin/settings'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3003/post?next=%2Fadmin%2Fsettings',
    );
  });
});
