import { expect, test } from '@playwright/test';
import { trackErrors } from './fixtures';

test('anonymous home shows the hero and rows without console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Find your next movie/ })).toBeVisible();
  await expect(page).toHaveTitle('CineSmart');
  await expect(page.getByRole('heading', { level: 2, name: 'Trending Now' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'For You' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('IMDb Top 250 list paginates to page 13', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/lists/imdb-top-250');
  await expect(page.getByText('250 titles')).toBeVisible();
  await expect(page.locator('main ul').first().locator(':scope > li')).toHaveCount(20);
  await page.getByRole('link', { name: 'Page 13' }).click();
  await expect(page).toHaveURL(/\?page=13$/);
  await expect(page.locator('main ul').first().locator(':scope > li')).toHaveCount(10);
  expect(errors).toEqual([]);
});

test('unknown paths and list keys show the 404 page inside the shell', async ({ page }) => {
  for (const path of ['/lists/nope', '/some/unknown']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1, name: "We couldn't find that page." }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
  }
});

test('/for-you signed out redirects to sign-in with a redirect back', async ({ page }) => {
  await page.goto('/for-you');
  await expect(page).toHaveURL(/\/login\?redirect=%2Ffor-you$/);
});
