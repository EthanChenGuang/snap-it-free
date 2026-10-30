import path from 'node:path';
import { defineConfig } from 'vitest/config';

const root = path.resolve(__dirname, '../../../..');

export default defineConfig({
  root,
  test: {
    include: ['.claude/skills/verify-subscription-sync/check/*.check.test.ts'],
    testTimeout: 120_000,
  },
  resolve: { alias: { '@': root } },
});
