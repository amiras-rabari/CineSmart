import { createBrowserRouter, type RouteObject } from 'react-router';
import { RouteErrorBoundary } from '@/features/errors/RouteErrorBoundary';
import { GuestOnly, RequireAuth } from '@/session/guards';
import { AuthLayout } from './layouts/AuthLayout';
import { RootLayout } from './layouts/RootLayout';
import { ShellLayout } from './layouts/ShellLayout';

type LazyModule = NonNullable<RouteObject['lazy']>;

/** A lazy page route; its own error boundary keeps errors inside the layout ([ARCH-6]). */
function page(path: string | undefined, lazy: LazyModule): RouteObject {
  return path === undefined
    ? { index: true, lazy, ErrorBoundary: RouteErrorBoundary }
    : { path, lazy, ErrorBoundary: RouteErrorBoundary };
}

// Route modules export `Component` for lazy loading ([DEC-3]).
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [page('dev/ui', () => import('@/features/dev/UiKitchenSink'))]
  : [];

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        Component: ShellLayout,
        children: [
          page(undefined, () => import('@/features/home/HomePage')),
          page('lists/:listKey', () => import('@/features/lists/RankedListPage')),
          page('browse', () => import('@/features/browse/BrowsePage')),
          page('search', () => import('@/features/search/SearchPage')),
          page('movies/:movieId', () => import('@/features/movie/MovieDetailsPage')),
          {
            Component: RequireAuth,
            children: [
              page('for-you', () => import('@/features/lists/ForYouPage')),
              page('watchlist', () => import('@/features/my-lists/WatchlistPage')),
              page('ratings', () => import('@/features/my-lists/RatingsPage')),
              page('profile', () => import('@/features/profile/ProfilePage')),
            ],
          },
          ...devRoutes,
          page('*', () => import('@/features/errors/NotFoundPage')),
        ],
      },
      {
        Component: AuthLayout,
        children: [
          {
            Component: GuestOnly,
            children: [
              page('login', () => import('@/features/auth/LoginPage')),
              page('signup', () => import('@/features/auth/SignupPage')),
            ],
          },
          page('resend-verification', () => import('@/features/auth/ResendVerificationPage')),
          page('forgot-password', () => import('@/features/auth/ForgotPasswordPage')),
          page('verify-email', () => import('@/features/auth/VerifyEmailPage')),
          page('reset-password', () => import('@/features/auth/ResetPasswordPage')),
          page('confirm-email', () => import('@/features/auth/ConfirmEmailPage')),
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
