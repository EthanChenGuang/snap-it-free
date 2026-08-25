import type { Messages } from '@/messages';

export type UgcDescriptionMeta = {
  categoryLabel: string | null;
  conditionLabel: string | null;
};

/** Parse category/condition lines prepended by PostForm.buildDescription. */
export function parseUgcDescriptionMeta(
  description: string | null | undefined,
  messages: Messages,
): UgcDescriptionMeta {
  if (!description?.trim()) {
    return { categoryLabel: null, conditionLabel: null };
  }

  const categoryPrefix = `${messages.post.categoryMeta}:`;
  const conditionPrefix = `${messages.post.conditionMeta}:`;
  let categoryLabel: string | null = null;
  let conditionLabel: string | null = null;

  for (const line of description.split('\n').slice(0, 4)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(categoryPrefix)) {
      categoryLabel = trimmed.slice(categoryPrefix.length).trim() || null;
    } else if (trimmed.startsWith(conditionPrefix)) {
      conditionLabel = trimmed.slice(conditionPrefix.length).trim() || null;
    }
  }

  return { categoryLabel, conditionLabel };
}

/** User-authored body text after stripping PostForm meta lines. */
export function stripUgcDescriptionMeta(
  description: string | null | undefined,
  messages: Messages,
): string | null {
  if (!description?.trim()) return null;

  const categoryPrefix = `${messages.post.categoryMeta}:`;
  const conditionPrefix = `${messages.post.conditionMeta}:`;
  const lines = description.split('\n');
  let start = 0;

  for (; start < lines.length; start++) {
    const trimmed = lines[start]?.trim() ?? '';
    if (trimmed.startsWith(categoryPrefix) || trimmed.startsWith(conditionPrefix)) {
      continue;
    }
    if (trimmed === '' && start < 4) {
      continue;
    }
    break;
  }

  const body = lines.slice(start).join('\n').trim();
  return body || null;
}
