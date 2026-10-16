import { expect, test, type Page } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeViolations,
  trackErrors,
  WIDTHS,
} from './fixtures';

// [P6] accessibility and responsive pass, anonymous screens (signed-in screens: account.spec.ts).
// One load per screen; the viewport is resized in place so the pass stays far below the shared
// 120/min public budget (contract [LIMIT-1]).

const SCREENS: { path: string; ready: (page: Page) => ReturnType<Page['getByRole']> }[] = [
  { path: '/', ready: (p) => p.getByRole('heading', { level: 2, name: 'Trending Now' }) },
  { path: '/lists/trending', ready: (p) => p.locator('main ul > li').first() },
  { path: '/browse', ready: (p) => p.locator('main ul > li').first() },
  { path: '/search?q=nolan', ready: (p) => p.locator('main ul > li').first() },
  { path: '/movies/118', ready: (p) => p.getByRole('heading', { name: 'More like this' }) },
  { path: '/login', ready: (p) => p.getByRole('button', { name: 'Sign in' }) },
  { path: '/signup', ready: (p) => p.getByRole('button', { name: 'Create account' }) },
  { path: '/forgot-password', ready: (p) => p.getByRole('heading', { level: 1 }) },
  { path: '/nope', ready: (p) => p.getByRole('heading', { level: 1 }) },
];

for (const screen of SCREENS) {
  test(`${screen.path}: axe clean, no horizontal scroll at ${WIDTHS.join('/')} px`, async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(screen.path);
    await expect(screen.ready(page)).toBeVisible();
    await expectNoSeriousAxeViolations(page, screen.path);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      await expectNoHorizontalScroll(page, `${screen.path} @ ${width}px`);
    }
    // Mobile layout gets its own axe run (different header, sheets, hidden arrows).
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoSeriousAxeViolations(page, `${screen.path} @ 375px`);
    expect(errors.filter((e) => !e.includes('status of 404'))).toEqual([]);
  });
}

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('skip link is the first stop and moves focus to main', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Trending Now' })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    // Shown on focus at the top left, above the sticky header.
    const box = await skip.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(32);
    expect(
      await page.evaluate(
        `document.elementFromPoint(${box!.x + 4}, ${box!.y + 4}) === document.activeElement`,
      ),
    ).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('every Tab stop on home has a visible focus indicator', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Trending Now' })).toBeVisible();
    const missing: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      // String expression: the e2e tsconfig has no DOM lib.
      const info = (await page.evaluate(`(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
        return { visible, name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40) || el.tagName };
      })()`)) as { visible: boolean; name: string } | null;
      if (info && !info.visible) missing.push(info.name);
    }
    expect(missing).toEqual([]);
  });

  test('Enter on a link → new page, focus on its h1', async ({ page }) => {
    await page.goto('/');
    const seeAll = page.getByRole('link', { name: /^See all/ }).first();
    await seeAll.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/lists\//);
    await expect(page.locator('#main h1')).toBeFocused();
  });

  test('Browse menu: open, move, close with Escape, focus returns', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Browse' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // Opened by keyboard: Radix focuses the first item; arrows move through the items.
    await expect(menu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('row arrows are reachable and scroll the row', async ({ page }) => {
    await page.goto('/');
    const right = page.getByRole('button', { name: 'Scroll Trending Now right' });
    await right.focus();
    await expect(right).toBeVisible();
    const scroller = page.getByRole('list', { name: 'Trending Now' });
    const before = Number(await scroller.evaluate((el) => el.scrollLeft));
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => Number(await scroller.evaluate((el) => el.scrollLeft)))
      .toBeGreaterThan(before);
  });
});

test.describe('keyboard, mobile', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('menu sheet: opens, traps focus, Escape closes and returns focus', async ({ page }) => {
    await page.goto('/');
    const open = page.getByRole('button', { name: 'Open menu' });
    await open.focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      expect(await sheet.evaluate((el) => el.contains(el.ownerDocument.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('search sheet and browse filters sheet open and close by keyboard', async ({ page }) => {
    await page.goto('/');
    const openSearch = page.getByRole('button', { name: 'Open search' });
    await openSearch.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(openSearch).toBeFocused();

    await page.goto('/browse');
    const filters = page.getByRole('button', { name: /^Filters/ });
    await filters.focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(filters).toBeFocused();
  });
});

test('reduced motion: transforms and smooth scrolling are off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const scroller = page.getByRole('list', { name: 'Trending Now' });
  await expect(scroller).toBeVisible();
  expect(
    await scroller.evaluate(
      (el) => el.ownerDocument.defaultView!.getComputedStyle(el).scrollBehavior,
    ),
  ).toBe('auto');
  const card = scroller.getByRole('link').first();
  expect(
    await card.evaluate(
      (el) => el.ownerDocument.defaultView!.getComputedStyle(el).transitionProperty,
    ),
  ).toBe('opacity');
});
