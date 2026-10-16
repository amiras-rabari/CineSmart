import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// E2E_USERNAME / E2E_PASSWORD (and E2E_BASE_URL) may live in the git-ignored .env.local ([DEC-4]).
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const chrome = { ...devices['Desktop Chrome'] };

// Needs the backend and `pnpm dev` or `pnpm preview` running ([DEC-4]).
// The public IP budget (120/min) and the test account are shared, so batches run in order:
//   public → cooldown (61 s) → a11y ∥ account → signed-in → limits
// `signed-in` uses all 5 `account` calls per 15 min; `limits` runs last because it exhausts the
// public, login and per-user read budgets on purpose. Run one alone with `--project=<name> --no-deps`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'public',
      use: chrome,
      testIgnore: [/a11y\.spec/, /flows\.spec/, /account\.spec/, /signed-in\.spec/, /limits\.spec/],
    },
    { name: 'cooldown', use: chrome, testMatch: /cooldown\.setup/, dependencies: ['public'] },
    {
      name: 'a11y',
      use: chrome,
      testMatch: [/a11y\.spec/, /flows\.spec/],
      dependencies: ['cooldown'],
    },
    { name: 'account', use: chrome, testMatch: /account\.spec/, dependencies: ['cooldown'] },
    {
      name: 'signed-in',
      use: chrome,
      testMatch: /signed-in\.spec/,
      dependencies: ['a11y', 'account'],
    },
    { name: 'limits', use: chrome, testMatch: /limits\.spec/, dependencies: ['signed-in'] },
  ],
});
