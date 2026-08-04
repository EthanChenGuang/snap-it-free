import { NextResponse } from 'next/server';
import { getOperatorSession, type OperatorSession } from '@/lib/admin/require-operator';

type OperatorSessionResult = OperatorSession | { error: NextResponse };

/** Route Handler gate used by admin mutation endpoints. */
export async function requireOperatorSession(): Promise<OperatorSessionResult> {
  const session = await getOperatorSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return session;
}
