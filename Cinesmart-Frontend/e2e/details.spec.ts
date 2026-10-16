import { expect, test, type Page } from '@playwright/test';

/** Console errors, except Chrome's log of the anonymous restore's 401 (by design). */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    const isRestore401 =
      msg.text().includes('status of 401') && msg.location().url.endsWith('/api/v1/auth/refresh');
    const isNotFound404 = msg.text().includes('status of 404');
    if (msg.type() === 'error' && !isRestore401 && !isNotFound404) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('anonymous details: fields, availability links, similar row, no user state', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/movies/118');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ratings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CineSmart' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where to watch in Canada' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More like this' })).toBeVisible();
  for (const link of await page.locator('a[target="_blank"]').all()) {
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(page.getByRole('button', { name: 'Add to watchlist', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('button', { name: 'Rate' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('anonymous action → sign in with a redirect back', async ({ page }) => {
  await page.goto('/movies/118');
  await page.getByRole('button', { name: 'Add to watchlist', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fmovies%2F118$/);
  await expect(page.getByText('Sign in to use your watchlist and ratings.')).toBeVisible();
});

test('anonymous card bookmark → sign in, no navigation to details', async ({ page }) => {
  await page.goto('/lists/imdb-top-250');
  const first = page.locator('main ul > li').first();
  await first.hover();
  await first.getByRole('button', { name: /^Add to watchlist: / }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Flists%2Fimdb-top-250$/);
});

test('unknown and invalid movie ids', async ({ page }) => {
  await page.goto('/movies/999999');
  await expect(page.getByRole('heading', { level: 1, name: 'Movie not found.' })).toBeVisible();
  await page.goto('/movies/abc');
  await expect(
    page.getByRole('heading', { level: 1, name: "We couldn't find that page." }),
  ).toBeVisible();
});

test('signed out, my pages redirect to sign in', async ({ page }) => {
  for (const path of ['/watchlist', '/ratings', '/profile']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}$`));
  }
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('details page fits at 375 px', async ({ page }) => {
    await page.goto('/movies/118');
    await expect(page.getByRole('heading', { name: 'More like this' })).toBeVisible();
    // A string expression: the e2e tsconfig has no DOM lib.
    const scrollWidth = Number(await page.evaluate('document.documentElement.scrollWidth'));
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});
