import { expect, test, type Page } from '@playwright/test';

/** Counts API GETs to a path (e.g. `/genres`). */
function countRequests(page: Page, path: string) {
  const counter = { count: 0 };
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === `/api/v1${path}`) counter.count++;
  });
  return counter;
}

async function movieCount(page: Page): Promise<number> {
  const text = await page.getByText(/^[\d,]+ movies?$/).textContent();
  return Number(text?.replace(/\D/g, ''));
}

test('browse: all movies, then genre + language + year combine with page reset', async ({
  page,
}) => {
  await page.goto('/browse?page=2');
  await expect(page.getByRole('heading', { level: 1, name: 'All movies' })).toBeVisible();
  await expect(page.getByText(/^[\d,]+ movies$/)).toBeVisible();
  const all = await movieCount(page);

  await page.getByRole('combobox', { name: 'Genre' }).click();
  await page.getByRole('option', { name: 'Sci-Fi' }).click();
  await expect(page).toHaveURL(/\/browse\?genreId=\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sci-Fi' })).toBeVisible();
  await expect.poll(() => movieCount(page)).toBeLessThan(all);
  const sciFi = await movieCount(page);

  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'English' }).click();
  await page.getByRole('combobox', { name: 'Year' }).click();
  await page.getByRole('option', { name: '2014', exact: true }).click();
  await expect(page).toHaveURL(/genreId=\d+&languageId=\d+&year=2014$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sci-Fi · English · 2014' }),
  ).toBeVisible();
  await expect.poll(() => movieCount(page)).toBeLessThanOrEqual(sciFi);

  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page).toHaveURL(/\/browse$/);
});

test('browse: a year with no movies shows the empty state', async ({ page }) => {
  await page.goto('/browse?year=1923');
  await expect(page.getByText('No movies match these filters.')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Clear filters' }).last().click();
  await expect(page).toHaveURL(/\/browse$/);
});

test('browse: an unknown genre is dropped with the notice, the year kept', async ({ page }) => {
  await page.goto('/browse?genreId=99999&year=2014');
  await expect(page.getByText("That filter isn't available, so it was removed.")).toBeVisible();
  await expect(page).toHaveURL(/\/browse\?year=2014$/);
  await expect(page.getByRole('heading', { level: 1, name: '2014' })).toBeVisible();
});

test('Browse menu: genre opens /browse?genreId=; a second open makes no new /genres request', async ({
  page,
}) => {
  const genres = countRequests(page, '/genres');
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'Browse' })
    .click();
  await page.getByRole('menuitem', { name: 'Genres' }).hover();
  await page.getByRole('menuitem', { name: 'Drama' }).click();
  await expect(page).toHaveURL(/\/browse\?genreId=\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Drama' })).toBeVisible();
  const afterFirst = genres.count;
  expect(afterFirst).toBe(1);

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'Browse' })
    .click();
  await page.getByRole('menuitem', { name: 'Genres' }).hover();
  await expect(page.getByRole('menuitem', { name: 'Drama' })).toBeVisible();
  expect(genres.count).toBe(afterFirst);
});

test('Browse menu: "By year" and "All languages…" focus their select', async ({ page }) => {
  const browse = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'Browse' });
  await page.goto('/');
  await browse.click();
  await page.getByRole('menuitem', { name: 'By year' }).click();
  await expect(page.getByRole('combobox', { name: 'Year' })).toBeFocused();
  await browse.click();
  await page.getByRole('menuitem', { name: 'Languages' }).hover();
  await page.getByRole('menuitem', { name: 'All languages…' }).click();
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeFocused();
});

test('search: title, person, too short, no match', async ({ page }) => {
  const searches = countRequests(page, '/movies/search');
  await page.goto('/');
  const box = page.getByRole('banner').getByRole('searchbox', { name: 'Search movies or people' });

  await box.fill('ab');
  await box.press('Enter');
  await expect(page.getByText('Type at least 3 characters.')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(searches.count).toBe(0);

  await box.fill('inter');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=inter$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Results for “inter”' })).toBeVisible();
  await expect(page.locator('main ul > li').first()).toContainText('Interstellar');

  await page.goto('/search?q=nolan');
  await expect(page.locator('main ul > li').first()).toBeVisible();
  await expect(page.getByRole('main')).toContainText(/Inception|The Dark Knight|Interstellar/);

  await page.goto('/search?q=zzqxvwkj');
  await expect(page.getByText('No movies or people match “zzqxvwkj”.')).toBeVisible();
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('filters live in a sheet; MobileNav "Browse by year" opens it on the year', async ({
    page,
  }) => {
    await page.goto('/browse');
    await expect(page.getByRole('combobox', { name: 'Genre' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Filters' }).click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await sheet.getByRole('combobox', { name: 'Genre' }).click();
    await page.getByRole('option', { name: 'Drama' }).click();
    await expect(page).toHaveURL(/\/browse\?genreId=\d+$/);
    await sheet.getByRole('button', { name: /^Show [\d,]+ movies?$/ }).click();
    await expect(page.getByRole('button', { name: 'Filters (1)' })).toBeVisible();
    // A string expression: the e2e tsconfig has no DOM lib.
    const scrollWidth = Number(await page.evaluate('document.documentElement.scrollWidth'));
    expect(scrollWidth).toBeLessThanOrEqual(375);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('link', { name: 'Browse by year' }).click();
    await expect(page).toHaveURL(/\/browse$/);
    await expect(
      page.getByRole('dialog', { name: 'Filters' }).getByRole('combobox', { name: 'Year' }),
    ).toBeFocused();
  });
});
