import { expect, test } from '@playwright/test';
import { trackApiRequests, trackErrors } from './fixtures';

// [P6] anonymous end-to-end flow and per-screen request counts ([ARCH-4] prefetch rule: a screen
// must stay far below the shared 120/min public budget, contract [LIMIT-1]).

test('home → see all → details → similar title', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  const trending = page.getByRole('region', { name: 'Trending Now' });
  await trending.getByRole('link', { name: /^See all/ }).click();
  await expect(page).toHaveURL(/\/lists\/trending$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Trending Now' })).toBeFocused();

  const first = page.locator('main ul > li').first().getByRole('link').first();
  const title = (await first.getAttribute('aria-label'))?.split(',')[0] ?? '';
  await first.click();
  await expect(page).toHaveURL(/\/movies\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  const similar = page.getByRole('region', { name: 'More like this' });
  const next = similar.getByRole('link', { name: /, \d{4}/ }).first();
  const nextTitle = (await next.getAttribute('aria-label'))?.split(',')[0] ?? '';
  await next.click();
  await expect(page.getByRole('heading', { level: 1, name: nextTitle })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect(errors).toEqual([]);
});

const SCREENS: [path: string, max: number][] = [
  ['/', 4],
  ['/lists/imdb-top-250', 3],
  ['/browse', 5],
  ['/search?q=nolan', 3],
  ['/movies/118', 4],
];

for (const [path, max] of SCREENS) {
  test(`${path} loads with at most ${max} API requests and none while idle`, async ({ page }) => {
    const requests = trackApiRequests(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const onLoad = [...requests];
    // Hover over cards and idle a little: no hover prefetch, no polling.
    for (const card of (await page.locator('main a[href^="/movies/"]').all()).slice(0, 5)) {
      await card.hover();
    }
    await page.waitForTimeout(2000);
    console.log(`${path}: ${onLoad.length} requests: ${onLoad.join(', ')}`);
    expect(onLoad.length).toBeLessThanOrEqual(max);
    expect(requests).toEqual(onLoad);
  });
}
