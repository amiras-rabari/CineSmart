import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { StrictMode, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter, useLocation, useRoutes, type RouteObject } from 'react-router';
import { TooltipProvider } from '@/components/ui/tooltip';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

/** Renders with the app providers (fresh QueryClient per call). */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: RenderOptions & { queryClient?: QueryClient } = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

/**
 * Renders routes in a `MemoryRouter` (optionally under StrictMode), with the app providers.
 * Not a data router: under jsdom its navigations build a `Request` whose AbortSignal undici rejects.
 * `location()` returns the current path + search.
 */
export function renderRoutes(
  routes: RouteObject[],
  initialEntry: string | { pathname: string; search?: string; state?: unknown },
  { strict = false, queryClient }: { strict?: boolean; queryClient?: QueryClient } = {},
) {
  const current = { path: '' };
  function Routes() {
    const location = useLocation();
    current.path = location.pathname + location.search;
    return useRoutes(routes);
  }
  const ui = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes />
    </MemoryRouter>
  );
  return {
    location: () => current.path,
    ...renderWithProviders(strict ? <StrictMode>{ui}</StrictMode> : ui, { queryClient }),
  };
}
