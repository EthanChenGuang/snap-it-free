import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'lib/**/*.test.ts',
      'lib/admin/**/*.test.ts',
      'messages/**/*.test.ts',
      'hooks/**/*.test.ts',
      'app/api/cron/**/*.test.ts',
      'app/api/stripe/**/*.test.ts',
      'app/api/subscription/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
