import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// This app defines a custom font-size scale in app/globals.css's `@theme`
// block: --text-h1, --text-h2, --text-h3, --text-body-lg, --text-body-md,
// --text-label-md, --text-label-sm. Plain `twMerge` has no knowledge of
// these custom `text-*` scale keys and falls back to pattern-matching them
// as generic "text-color" utilities, which puts them in the same conflict
// group as real color classes like `text-on-primary`/`text-on-surface` and
// silently drops the color class when both appear in one merge call (e.g.
// `buttonVariants`'s `variant="chipActive" size="sm"` output). Registering
// the scale here teaches tailwind-merge these are font-size utilities, not
// color utilities.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h1', 'h2', 'h3', 'body-lg', 'body-md', 'label-md', 'label-sm'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
