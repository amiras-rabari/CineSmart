import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { Api, PASSWORD, signIn, USERNAME } from './fixtures';

// Signed-in acceptance checks for P2, P4 and P5 against the real backend ([DEC-4]).
// Needs E2E_USERNAME / E2E_PASSWORD (from .env.local) for a verified account with no activity.
//
// Runs serially in ONE browser context: two contexts presenting the same refresh cookie would be
// treated as token theft (contract [AUTH-1]). Setup and cleanup go through a separate API session.
// Budgets respected: login 10/min, account 5/15 min (this file uses exactly 5), writes 60/min per
// user (the bulk steps wait for a fresh window first). Run it on its own:
//   pnpm exec playwright test e2e/signed-in.spec.ts

const TEMP_PASSWORD = `${PASSWORD}-e2e`;

test.skip(!USERNAME || !PASSWORD, 'Set E2E_USERNAME and E2E_PASSWORD (e.g. in .env.local).');
test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let page: Page;
let api: Api;
/** Set while the account's password is TEMP_PASSWORD, so afterAll can put it back. */
let passwordChanged = false;

/** Waits out the per-user write window (60/min, fixed window) before a bulk step. */
async function freshWriteWindow() {
  await page.waitForTimeout(61_000);
}

function movieIdOf(href: string | null): number {
  const id = Number(href?.match(/\/movies\/(\d+)/)?.[1]);
  expect(id).toBeGreaterThan(0);
  return id;
}

const exact = (name: string) => ({ name, exact: true });

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  api = await Api.login(USERNAME, PASSWORD);
  const profile = await api.get<{
    watchlistCount: number;
    ratingCount: number;
    watchedCount: number;
  }>('/me');
  expect(profile, 'the test account must start with no activity').toMatchObject({
    watchlistCount: 0,
    ratingCount: 0,
    watchedCount: 0,
  });
  context = await browser.newContext();
  page = await context.newPage();
  await signIn(page);
});

test.afterAll(async () => {
  if (passwordChanged) {
    // Put the original password back whatever happened.
    const tmp = await Api.login(USERNAME, TEMP_PASSWORD);
    const status = await tmp.post('/auth/password/change', {
      currentPassword: TEMP_PASSWORD,
      newPassword: PASSWORD,
    });
    console.log(`password restore → ${status}`);
    await tmp.dispose();
  }
  await context?.close();
  await api?.dispose();
});

test.describe('P2 signed in', () => {
  test('home For You row, /for-you cold start banner and reasons', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'For You' })).toBeVisible();
    await page.goto('/for-you');
    await expect(page.getByText('Rate, like, watch or add a few movies')).toBeVisible();
    await expect(page.getByText('Popular on CineSmart').first()).toBeVisible();
  });
});

test.describe('P4 activity', () => {
  test('watchlist flips at once; back on home the card has the bookmark without a refetch', async () => {
    test.setTimeout(60_000);
    await page.goto('/');
    const trending = page.getByRole('region', { name: 'Trending Now' });
    const firstCard = trending.getByRole('link', { name: /, \d{4}/ }).first();
    const id = movieIdOf(await firstCard.getAttribute('href'));

    let homeRequests = 0;
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/api/v1/home') homeRequests++;
    });
    await firstCard.click();
    const add = page.getByRole('button', exact('Add to watchlist'));
    const put = page.waitForResponse(
      (r) => r.url().endsWith(`/movies/${id}/watchlist`) && r.request().method() === 'PUT',
    );
    await add.click();
    await expect(page.getByRole('button', exact('Remove from watchlist'))).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const state = (await (await put).json()) as { inWatchlist: boolean };
    expect(state.inWatchlist).toBe(true);

    await page.goBack();
    await expect(trending.locator(`a[href="/movies/${id}"]`).first()).toHaveAttribute(
      'aria-label',
      /in your watchlist/,
    );
    expect(homeRequests).toBe(0);
    expect(await api.del(`/movies/${id}/watchlist`)).toBe(200);
  });

  test('double-click on Watched sends one request', async () => {
    await page.goto('/movies/118');
    let puts = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/movies/118/watched') && r.method() === 'PUT') puts++;
    });
    await page.getByRole('button', exact('Mark as watched')).dblclick();
    await expect(page.getByRole('button', exact('Watched'))).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.waitForTimeout(500);
    expect(puts).toBe(1);
    const del = page.waitForResponse(
      (r) => r.url().endsWith('/movies/118/watched') && r.request().method() === 'DELETE',
    );
    await page.getByRole('button', exact('Watched')).click();
    await del;
    await expect(page.getByRole('button', exact('Mark as watched'))).toBeVisible();
  });

  test('rate 8.5, reload keeps it, Remove → Rate; 8.55 cannot be saved', async () => {
    await page.goto('/movies/118');
    await page.getByRole('button', exact('Rate')).click();
    const input = page.getByRole('textbox', { name: 'Your rating' });
    await input.fill('8.55');
    await expect(page.getByRole('button', exact('Save'))).toBeDisabled();
    await input.fill('8.5');
    const put = page.waitForResponse(
      (r) => r.url().endsWith('/movies/118/rating') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', exact('Save')).click();
    expect((await put).request().postDataJSON()).toEqual({ rating: 8.5 });

    await page.reload();
    const trigger = page.getByRole('button', { name: 'Your rating: 8.5. Change rating' });
    await expect(trigger).toBeVisible();
    await trigger.click();
    const del = page.waitForResponse(
      (r) => r.url().endsWith('/movies/118/rating') && r.request().method() === 'DELETE',
    );
    await page.getByRole('button', exact('Remove rating')).click();
    await del;
    await expect(page.getByRole('button', exact('Rate'))).toBeVisible();
  });

  test('Like → Dislike → Dislike sends PUT LIKE, PUT DISLIKE, DELETE', async () => {
    await page.goto('/movies/118');
    const sent: string[] = [];
    page.on('request', (r) => {
      if (!r.url().endsWith('/movies/118/reaction')) return;
      const body = r.postDataJSON() as { reaction?: string } | null;
      sent.push(body?.reaction ? `${r.method()} ${body.reaction}` : r.method());
    });
    const group = page.getByRole('group', { name: 'Your reaction' });
    const like = group.getByRole('button', exact('Like'));
    const dislike = group.getByRole('button', exact('Dislike'));
    const settled = () => page.waitForResponse((r) => r.url().endsWith('/movies/118/reaction'));

    let done = settled();
    await like.click();
    await done;
    done = settled();
    await dislike.click();
    await done;
    await expect(dislike).toHaveAttribute('aria-pressed', 'true');
    done = settled();
    await dislike.click();
    await done;
    await expect(dislike).toHaveAttribute('aria-pressed', 'false');
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(sent).toEqual(['PUT LIKE', 'PUT DISLIKE', 'DELETE']);
    await expect(
      page.getByText('Your rating counts toward the CineSmart average within the hour.'),
    ).toBeVisible();
  });

  test('backend unreachable → rollback + error toast', async () => {
    await page.goto('/movies/118');
    await page.route('**/api/v1/movies/118/watchlist', (route) => route.abort());
    await page.getByRole('button', exact('Add to watchlist')).click();
    await expect(page.getByText("We couldn't reach CineSmart.")).toBeVisible();
    await expect(page.getByRole('button', exact('Add to watchlist'))).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.unroute('**/api/v1/movies/118/watchlist');
  });

  test('a watched movie is excluded from similar titles after reload', async () => {
    await page.goto('/movies/118');
    const similar = page.getByRole('region', { name: 'More like this' });
    const first = similar.getByRole('link', { name: /, \d{4}/ }).first();
    const id = movieIdOf(await first.getAttribute('href'));
    expect(await api.put(`/movies/${id}/watched`)).toBe(200);
    await page.reload();
    await expect(similar.getByRole('link', { name: /, \d{4}/ }).first()).toBeVisible();
    await expect(similar.locator(`a[href="/movies/${id}"]`)).toHaveCount(0);
    expect(await api.del(`/movies/${id}/watched`)).toBe(200);
  });
});

test.describe('P5 lists and profile', () => {
  test('watchlist: newest first, page 2, removing its last item returns to page 1; counts follow', async () => {
    test.setTimeout(180_000);
    await freshWriteWindow();
    const top = await api.get<{ results: { movieId: number; title: string }[] }>(
      '/movies/imdb-top-250?size=21',
    );
    const ids = top.results.map((m) => m.movieId);
    expect(ids).toHaveLength(21);
    for (const id of ids) expect(await api.put(`/movies/${id}/watchlist`)).toBe(200);

    try {
      await page.goto('/watchlist');
      await expect(page.getByText('21 titles')).toBeVisible();
      const cards = page.locator('main ul').first().locator(':scope > li');
      await expect(cards).toHaveCount(20);
      // Newest first: the last one added leads.
      await expect(cards.first().locator(`a[href="/movies/${ids[20]}"]`)).toBeVisible();
      await expect(cards.first().getByText(/^Added /)).toBeVisible();

      await page.getByRole('link', { name: 'Page 2' }).click();
      await expect(page).toHaveURL(/\/watchlist\?page=2$/);
      await expect(cards).toHaveCount(1);
      await cards
        .first()
        .getByRole('button', { name: /^Remove from watchlist: / })
        .click();
      await expect(page).toHaveURL(/\/watchlist$/);
      await expect(page.getByText('20 titles')).toBeVisible();

      await page.goto('/profile');
      await expect(page.getByRole('link', { name: 'Watchlist: 20. Open' })).toBeVisible();
    } finally {
      for (const id of ids) await api.del(`/movies/${id}/watchlist`);
    }
  });

  test('ratings list, profile counts, liked/disliked, watched marker, For You adapts', async () => {
    test.setTimeout(120_000);
    const top = await api.get<{ results: { movieId: number }[] }>('/movies/imdb-top-250?size=5');
    const [a, b, c, d] = top.results.map((m) => m.movieId) as [number, number, number, number];
    const setup = [
      api.put(`/movies/${a}/rating`, { rating: 8.5 }),
      api.put(`/movies/${b}/rating`, { rating: 7 }),
      api.put(`/movies/${a}/watched`),
      api.put(`/movies/${c}/reaction`, { reaction: 'LIKE' }),
      api.put(`/movies/${d}/reaction`, { reaction: 'DISLIKE' }),
    ];
    for (const status of await Promise.all(setup)) expect(status).toBe(200);

    try {
      await page.goto('/ratings');
      await expect(page.getByText('2 rated')).toBeVisible();
      const cards = page.locator('main ul').first().locator(':scope > li');
      await expect(cards).toHaveCount(2);
      await expect(cards.getByText(/^Rated /)).toHaveCount(2);
      await expect(page.locator(`main a[href="/movies/${a}"]`)).toHaveAttribute(
        'aria-label',
        /watched/,
      );

      await page.goto('/profile');
      await expect(page.getByRole('link', { name: 'Ratings: 2. Open' })).toBeVisible();
      const count = (label: string) =>
        page.getByRole('main').getByText(label, { exact: true }).locator('..');
      await expect(count('Watched')).toContainText('1');
      await expect(count('Liked')).toContainText('1');
      await expect(count('Disliked')).toContainText('1');

      await page.goto('/for-you');
      await expect(page.locator('main ul').first().locator(':scope > li').first()).toBeVisible();
      await expect(page.getByText('Rate, like, watch or add a few movies')).toHaveCount(0);
    } finally {
      await Promise.all([
        api.del(`/movies/${a}/rating`),
        api.del(`/movies/${b}/rating`),
        api.del(`/movies/${a}/watched`),
        api.del(`/movies/${c}/reaction`),
        api.del(`/movies/${d}/reaction`),
      ]);
    }
  });

  test('61st write in a minute → 429 toast with seconds, and rollback', async () => {
    test.setTimeout(120_000);
    await freshWriteWindow();
    // DELETE on a movie not in the watchlist changes nothing but counts toward the budget.
    for (let i = 0; i < 60; i++) await api.del('/movies/118/watchlist');
    await page.goto('/movies/118');
    await page.getByRole('button', exact('Add to watchlist')).click();
    await expect(page.getByText(/You're doing that too fast\. Try again in \d+ s\./)).toBeVisible();
    await expect(page.getByRole('button', exact('Add to watchlist'))).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('change email → confirmation alert', async () => {
    await page.goto('/profile');
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('button', exact('Change email')) });
    await form.getByLabel('Current password').fill(PASSWORD);
    // Unique per run: once a link is confirmed, the old address would be the account's own.
    const newEmail = `${USERNAME.toLowerCase()}+e2e-${Date.now()}@example.com`;
    await form.getByLabel('New email').fill(newEmail);
    await form.getByRole('button', exact('Change email')).click();
    await expect(
      page.getByText(
        `We sent a confirmation link to ${newEmail}. Your email changes after you open it.`,
      ),
    ).toBeVisible();
  });

  test('change password: wrong, same, correct; the other browser is signed out', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage);

    await page.goto('/profile');
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('button', exact('Change password')) });
    const submit = async (current: string, next: string) => {
      await form.getByLabel('Current password').fill(current);
      await form.getByLabel('New password', { exact: true }).fill(next);
      await form.getByLabel('Confirm new password').fill(next);
      await form.getByRole('button', exact('Change password')).click();
    };

    await submit('definitely-wrong-1', TEMP_PASSWORD);
    await expect(form.getByText('Is incorrect.')).toBeVisible();

    await submit(PASSWORD, PASSWORD);
    await expect(form.getByText('Must be different from the current password.')).toBeVisible();

    await submit(PASSWORD, TEMP_PASSWORD);
    passwordChanged = true;
    await expect(page.getByText('Password changed. Other devices were signed out.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: `Account menu for ${USERNAME}` })).toBeVisible();

    // The other browser's next action: 401 → refresh fails → signed out.
    await otherPage.goto('/profile');
    await expect(otherPage).toHaveURL(/\/login\?redirect=%2Fprofile$/);
    await other.close();
  });
});
