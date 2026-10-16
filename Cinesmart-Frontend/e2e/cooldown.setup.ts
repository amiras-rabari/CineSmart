import { test } from '@playwright/test';

// The public budget is a fixed 120/min window per IP (contract [LIMIT-1]) shared by every
// project. Waiting one full window between batches keeps each batch inside its own minute.
test('wait for a fresh public rate-limit window', async ({ page }) => {
  test.setTimeout(90_000);
  await page.waitForTimeout(61_000);
});
