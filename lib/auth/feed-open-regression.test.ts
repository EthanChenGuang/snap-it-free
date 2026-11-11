import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('AUTH-08 feed open regression', () => {
  it('FeedHomeClient does not import auth gate components', () => {
    const source = readSource('components/listings/FeedHomeClient.tsx');
    expect(source).not.toMatch(/AuthPromptModal/);
    expect(source).not.toMatch(/authGate/);
    expect(source).not.toMatch(/useAuthSession/);
  });

  it('app/(feed)/page.tsx does not add auth gate to home feed', () => {
    const source = readSource('app/(feed)/page.tsx');
    expect(source).not.toMatch(/AuthPromptModal/);
    expect(source).not.toMatch(/authGate/);
    expect(source).not.toMatch(/useAuthSession/);
  });
});
