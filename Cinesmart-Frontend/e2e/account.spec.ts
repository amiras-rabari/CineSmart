import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  Api,
  expectNoHorizontalScroll,
  expectNoSeriousAxeViolations,
  signIn,
  USERNAME,
  PASSWORD,
  WIDTHS,
} from './fixtures';

// [P6] signed-in pass: axe + responsive on the account screens, keyboard on the user menu and the
// rating popover, session persistence, and the full signed-in flow ending in sign out.
// One browser context, serial (two contexts sharing a refresh cookie = token theft, contract
// [AUTH-1]). Uses no `account` budget: 2 UI logins + 1 API login, ~10 writes. Leaves no activity.

test.skip(!USERNAME || !PASSWORD, 'Set E2E_USERNAME and E2E_PASSWORD (e.g. in .env.local).');
test.describe.configure({ mode: 'serial' });

const MOVIE = 118;
let context: BrowserContext;
let page: Page;
let api: Api;

const exact = (name: string) => ({ name, exact: true });
const accountMenu = () => page.getByRole('button', { name: `Account menu for ${USERNAME}` });

test.beforeAll(async ({ browser }) => {
  api = await Api.login(USERNAME, PASSWORD);
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  await signIn(page);
});

test.afterAll(async () => {
  // Whatever happened, leave the account with no activity.
  await Promise.all([api?.del(`/movies/${MOVIE}/watchlist`), api?.del(`/movies/${MOVIE}/rating`)]);
  await context?.close();
  await api?.dispose();
});

const SCREENS: [path: string, ready: string][] = [
  ['/watchlist', 'Your watchlist is empty.'],
  ['/ratings', "You haven't rated any movies yet."],
  ['/profile', 'Change password'],
  ['/for-you', 'For You'],
];

for (const [path, ready] of SCREENS) {
  test(`${path}: axe clean, no horizontal scroll`, async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await expect(page.getByText(ready).first()).toBeVisible();
    await expectNoSeriousAxeViolations(page, path);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      await expectNoHorizontalScroll(page, `${path} @ ${width}px`);
    }
    await expectNoSeriousAxeViolations(page, `${path} @ 375px`);
  });
}

test('details signed in: controls, open rating popover and user menu are axe clean', async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/movies/${MOVIE}`);
  await expect(page.getByRole('button', exact('Add to watchlist'))).toBeVisible();
  await expectNoSeriousAxeViolations(page, 'details signed in');
  await page.getByRole('button', exact('Rate')).click();
  await expect(page.getByRole('textbox', { name: 'Your rating' })).toBeVisible();
  await expectNoSeriousAxeViolations(page, 'rating popover');
  await page.keyboard.press('Escape');
  await accountMenu().click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expectNoSeriousAxeViolations(page, 'user menu');
  await page.keyboard.press('Escape');
});

test('keyboard: user menu and rating popover open, close with Escape, focus returns', async () => {
  await page.goto(`/movies/${MOVIE}`);
  const menuButton = accountMenu();
  await menuButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(menuButton).toBeFocused();

  const rate = page.getByRole('button', exact('Rate'));
  await rate.focus();
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox', { name: 'Your rating' });
  await expect(input).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(input).toBeHidden();
  await expect(rate).toBeFocused();
});

test('session: a reload keeps it; two pages reloading together stay signed in', async () => {
  await page.goto('/profile');
  await page.reload();
  await expect(accountMenu()).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);

  // Same context = same refresh cookie: the Web Lock lets one refresh, the other adopts it.
  const second = await context.newPage();
  await second.goto('/watchlist');
  await expect(second.getByText('Your watchlist is empty.')).toBeVisible();
  await Promise.all([page.reload(), second.reload()]);
  await expect(accountMenu()).toBeVisible();
  await expect(second.getByText('Your watchlist is empty.')).toBeVisible();
  await expect(second).toHaveURL(/\/watchlist$/);
  await second.close();
  // Still signed in on the next navigation (the rotation didn't revoke the session).
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible();
});

test('flow: watchlist add/remove from details → watchlist page → rate → ratings page → sign out', async () => {
  await page.goto(`/movies/${MOVIE}`);
  const title = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';

  await page.getByRole('button', exact('Add to watchlist')).click();
  await expect(page.getByRole('button', exact('Remove from watchlist'))).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/watchlist');
  await expect(page.getByText('1 title')).toBeVisible();
  await expect(page.locator(`main a[href="/movies/${MOVIE}"]`).first()).toBeVisible();

  await page.locator(`main a[href="/movies/${MOVIE}"]`).first().click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.getByRole('button', exact('Remove from watchlist')).click();
  await expect(page.getByRole('button', exact('Add to watchlist'))).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.goto('/watchlist');
  await expect(page.getByText('Your watchlist is empty.')).toBeVisible();

  await page.goto(`/movies/${MOVIE}`);
  await page.getByRole('button', exact('Rate')).click();
  await page.getByRole('textbox', { name: 'Your rating' }).fill('7.5');
  const put = page.waitForResponse(
    (r) => r.url().endsWith(`/movies/${MOVIE}/rating`) && r.request().method() === 'PUT',
  );
  await page.getByRole('button', exact('Save')).click();
  expect((await put).status()).toBe(200);
  await page.goto('/ratings');
  await expect(page.getByText('1 rated')).toBeVisible();
  await expect(page.locator(`main a[href="/movies/${MOVIE}"]`).first()).toBeVisible();
  expect(await api.del(`/movies/${MOVIE}/rating`)).toBe(200);

  await accountMenu().click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
  await page.goto('/watchlist');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fwatchlist$/);
});
