import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertCanRemoveOperator, getOperatorSession } from '@/lib/admin/require-operator';

const OperatorEmailSchema = z.object({
  email: z.string().email(),
});

async function listOperators(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('operator_allowlist').select('email').order('email');

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.email as string);
}

export async function GET() {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const operators = await listOperators(session.supabase);
    return NextResponse.json({ operators });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load operators';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = OperatorEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const { error } = await session.supabase.from('operator_allowlist').insert({
    email,
    created_by: session.user.id,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该邮箱已在允许名单中' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const operators = await listOperators(session.supabase);
    return NextResponse.json({ operators });
  } catch (listError) {
    const message = listError instanceof Error ? listError.message : 'Failed to load operators';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getOperatorSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = OperatorEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetEmail = parsed.data.email.trim().toLowerCase();

  let operators: string[];
  try {
    operators = await listOperators(session.supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load operators';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const guard = assertCanRemoveOperator(session.user.email, targetEmail, operators);
  if (!guard.allowed) {
    const message =
      guard.reason === 'self'
        ? '不能删除自己的 operator 权限'
        : '至少保留一名 operator';
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const { error } = await session.supabase
    .from('operator_allowlist')
    .delete()
    .eq('email', targetEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const updated = await listOperators(session.supabase);
    return NextResponse.json({ operators: updated });
  } catch (listError) {
    const message = listError instanceof Error ? listError.message : 'Failed to load operators';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
