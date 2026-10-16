import { expect, request, test } from '@playwright/test';
import { API, Api, PASSWORD, signIn, USERNAME } from './fixtures';

// [P6] live rate limits: [COVER] 51 (per-user read limit → ErrorState countdown → auto-retry) and
// [COVER] 7 (IP `public` limit on a query, IP `login` limit on a form). Each test exhausts a real
// budget, so this file runs last and serially (project `limits`). Login uses only correct
// passwords: wrong ones would count toward the lockout and the IP block (contract [LIMIT-3]).

test.skip(!USERNAME || !PASSWORD, 'Set E2E_USERNAME and E2E_PASSWORD (e.g. in .env.local).');
test.describe.configure({ mode: 'serial' });

const COUNTDOWN = /Too many requests\. Try again in \d+ s\./;

test('per-user read limit: /watchlist shows the countdown, then loads by itself', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signIn(page);
  const api = await Api.login(USERNAME, PASSWORD);
  try {
    // Same user → same 120/min `read` budget (contract [LIMIT-2]).
    let status = 0;
    for (let i = 0; i < 130 && status !== 429; i++) {
      status = await api.getStatus('/me/watched');
    }
    expect(status, 'read budget exhausted').toBe(429);
    await page.goto('/watchlist');
    await expect(page.getByRole('heading', { name: "You're going a bit fast" })).toBeVisible();
    await expect(page.getByText(COUNTDOWN).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeDisabled();
    await expect(page.getByText('Your watchlist is empty.')).toBeVisible({ timeout: 70_000 });
  } finally {
    await api.dispose();
  }
});

test('IP public limit: a list shows the countdown, then loads by itself', async ({ browser }) => {
  test.setTimeout(150_000);
  const http = await request.newContext();
  let status = 0;
  for (let i = 0; i < 130 && status !== 429; i++)
    status = (await http.get(`${API}/genres`)).status();
  expect(status, 'public budget exhausted').toBe(429);
  await http.dispose();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/lists/imdb-top-250');
  await expect(page.getByRole('heading', { name: "You're going a bit fast" })).toBeVisible();
  await expect(page.getByText(COUNTDOWN).first()).toBeVisible();
  await expect(page.getByText('250 titles')).toBeVisible({ timeout: 70_000 });
  await context.close();
});

test('IP login limit: the sign-in form counts down with submit disabled', async ({ browser }) => {
  test.setTimeout(150_000);
  const http = await request.newContext();
  let status = 0;
  for (let i = 0; i < 12 && status !== 429; i++) {
    status = (
      await http.post(`${API}/auth/login`, { data: { username: USERNAME, password: PASSWORD } })
    ).status();
  }
  expect(status, 'login budget exhausted').toBe(429);
  await http.dispose();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Username').fill(USERNAME);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(COUNTDOWN)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  await expect(page.getByText('You can try again now.')).toBeVisible({ timeout: 70_000 });
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await context.close();
});
