import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // jsdom's AbortSignal is not the one Node's `Request` (used by MSW) accepts, so a request with
  // a TanStack Query signal would fail. Outside MSW's patched fetch: drop the signal, keep aborts.
  const mswFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const signal = init?.signal;
    if (!signal) return mswFetch(input, init);
    const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(abortError()), { once: true });
      mswFetch(input, { ...init, signal: undefined }).then(resolve, reject);
    });
  };
});
afterEach(async () => {
  cleanup();
  server.resetHandlers();
  // Imported lazily so test files can vi.mock the session's dependencies (sonner, cross-tab).
  const { resetSessionForTests } = await import('@/session/session-manager');
  resetSessionForTests();
});
afterAll(() => server.close());

// jsdom has no matchMedia.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom has no ResizeObserver (Radix Slider measures its thumb).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
