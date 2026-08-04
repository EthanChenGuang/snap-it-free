import type { SupabaseClient } from '@supabase/supabase-js';

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
