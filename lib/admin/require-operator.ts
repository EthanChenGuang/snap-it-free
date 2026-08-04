import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

export function isOperatorEmail(email: string, allowlist: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  return allowlist.some((entry) => entry.trim().toLowerCase() === normalized);
}

/** D-46: operator cannot remove their own email from allowlist */
export function cannotRemoveSelf(actorEmail: string, targetEmail: string): boolean {
  return actorEmail.trim().toLowerCase() === targetEmail.trim().toLowerCase();
}

/** D-47: allowlist must keep at least one operator */
export function cannotRemoveLast(allowlist: string[], targetEmail: string): boolean {
  const normalizedTarget = targetEmail.trim().toLowerCase();
  const remaining = allowlist.filter(
    (entry) => entry.trim().toLowerCase() !== normalizedTarget,
  );
  return remaining.length === 0;
}

export type OperatorRemovalBlockReason = 'self' | 'last';

export function assertCanRemoveOperator(
  actorEmail: string,
  targetEmail: string,
  allowlistEmails: string[],
): { allowed: true } | { allowed: false; reason: OperatorRemovalBlockReason } {
  if (cannotRemoveSelf(actorEmail, targetEmail)) {
    return { allowed: false, reason: 'self' };
  }
  if (cannotRemoveLast(allowlistEmails, targetEmail)) {
    return { allowed: false, reason: 'last' };
  }
  return { allowed: true };
}

export async function requireOperator(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('operator_allowlist')
    .select('email')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data != null;
}

export type OperatorSession = {
  user: User;
  supabase: SupabaseClient;
};

/** Route Handler gate: authenticated user on operator allowlist, or null. */
export async function getOperatorSession(): Promise<OperatorSession | null> {
  const user = await requireAuth();
  if (!user?.email) {
    return null;
  }

  const supabase = await createClient();
  const allowed = await requireOperator(supabase, user.email);
  if (!allowed) {
    return null;
  }

  return { user, supabase };
}

export function canEnableSource(
  implementationStatus: 'live' | 'coming_soon',
  enabled: boolean | undefined,
): boolean {
  if (enabled === true && implementationStatus === 'coming_soon') {
    return false;
  }
  return true;
}
