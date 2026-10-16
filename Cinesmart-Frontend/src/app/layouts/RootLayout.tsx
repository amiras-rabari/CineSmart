import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { FullPageSplash } from '@/components/feedback/FullPageSplash';
import { restoreSession } from '@/session/session-manager';
import { useSession } from '@/session/session-store';
import { RouteAnnouncer } from './RouteAnnouncer';

/** Top of the route tree: restores the session before any route renders ([ARCH-2], [ARCH-6]). */
export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AuthGate />
      <ScrollRestoration />
    </div>
  );
}

/** Routes render only after the restore settled, so their first requests carry the right token. */
function AuthGate() {
  const { status } = useSession();
  useEffect(() => {
    void restoreSession();
  }, []);
  if (status === 'restoring') return <FullPageSplash />;
  return (
    <>
      <Outlet />
      <RouteAnnouncer />
    </>
  );
}
