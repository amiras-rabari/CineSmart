import AxeBuilder from '@axe-core/playwright';
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';

export const API = (process.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1').replace(
  /\/$/,
  '',
);
export const USERNAME = process.env.E2E_USERNAME ?? '';
export const PASSWORD = process.env.E2E_PASSWORD ?? '';

/** The four widths of the [P6] responsive pass. */
export const WIDTHS = [375, 768, 1024, 1440] as const;

/** Collects console errors, except Chrome's log of the anonymous restore's 401 (by design). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    const isRestore401 =
      msg.text().includes('status of 401') && msg.location().url.endsWith('/api/v1/auth/refresh');
    // Posters are external URLs that may be broken (contract [CONV-3]); PosterImage falls back.
    const isExternalResource =
      msg.text().startsWith('Failed to load resource') && !msg.location().url.startsWith(API);
    if (msg.type() === 'error' && !isRestore401 && !isExternalResource) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** axe (WCAG 2.2 A/AA rules): no serious or critical violations. */
export async function expectNoSeriousAxeViolations(page: Page, label: string) {
  // Let enter animations (popover/menu fade-in) finish: mid-fade colours fail color-contrast.
  // Infinite ones (skeleton pulse) never finish, so they are skipped.
  await page.evaluate(
    `Promise.all(document.getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => undefined)))`,
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes
          .map((n) => `${n.target.join(' ')} [${n.any[0]?.message ?? ''}]`)
          .join(' | ')}`,
    );
  expect(serious, `axe on ${label}`).toEqual([]);
}

/** No horizontal page scroll at the current viewport width. */
export async function expectNoHorizontalScroll(page: Page, label: string) {
  // A string expression: the e2e tsconfig has no DOM lib.
  const overflow = Number(
    await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    ),
  );
  expect(overflow, `horizontal overflow on ${label}`).toBeLessThanOrEqual(0);
}

/** API requests (to the backend) the page makes, by `METHOD /path`. */
export function trackApiRequests(page: Page) {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.url().startsWith(API) && r.method() !== 'OPTIONS') {
      seen.push(`${r.method()} ${new URL(r.url()).pathname.replace('/api/v1', '')}`);
    }
  });
  return seen;
}

/** A separate API session (own cookie jar) for setup and cleanup. */
export class Api {
  private readonly http: APIRequestContext;
  private readonly token: string;

  private constructor(http: APIRequestContext, token: string) {
    this.http = http;
    this.token = token;
  }

  static async login(username: string, password: string): Promise<Api> {
    const http = await request.newContext();
    const res = await http.post(`${API}/auth/login`, { data: { username, password } });
    expect(res.status(), 'API login').toBe(200);
    const { accessToken } = (await res.json()) as { accessToken: string };
    return new Api(http, accessToken);
  }

  private headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.http.get(`${API}${path}`, { headers: this.headers() });
    expect(res.ok(), `GET ${path} → ${res.status()}`).toBeTruthy();
    return (await res.json()) as T;
  }

  /** GET that only reports the status (e.g. to use up a rate-limit budget). */
  async getStatus(path: string): Promise<number> {
    return (await this.http.get(`${API}${path}`, { headers: this.headers() })).status();
  }

  async put(path: string, data?: unknown): Promise<number> {
    return (await this.http.put(`${API}${path}`, { headers: this.headers(), data })).status();
  }

  async del(path: string): Promise<number> {
    return (await this.http.delete(`${API}${path}`, { headers: this.headers() })).status();
  }

  async post(path: string, data: unknown): Promise<number> {
    return (await this.http.post(`${API}${path}`, { headers: this.headers(), data })).status();
  }

  dispose() {
    return this.http.dispose();
  }
}

/** Signs in through the UI and waits for the account menu. */
export async function signIn(target: Page, password = PASSWORD) {
  await target.goto('/login');
  await target.getByLabel('Username').fill(USERNAME);
  await target.getByLabel('Password', { exact: true }).fill(password);
  await target.getByRole('button', { name: 'Sign in' }).click();
  await expect(target).toHaveURL(/\/$/);
  await expect(target.getByRole('button', { name: `Account menu for ${USERNAME}` })).toBeVisible();
}
