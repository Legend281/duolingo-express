import { defineConfig } from 'vitest/config';

// Two groups:
//  - unit: pure logic in src/services (geocoding, routing, planning) — fast, no network.
//  - api:  starts the real server on a throwaway database (tests/api/globalSetup.ts) and
//          exercises it over HTTP.
// Run with `npm test` (both), or `npx vitest run --project unit` / `--project api`.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'api',
          include: ['tests/api/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['tests/api/globalSetup.ts'],
          // One server, one database: run files one after another.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 90_000,
        },
      },
    ],
  },
});
