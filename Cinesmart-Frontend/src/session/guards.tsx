// Route guards: plan [ARCH-6]. They run only after the restore settled (AuthGate).
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { loginPath, safeRedirect } from './redirect';
import { useSession } from './session-store';

/** Protected routes. Expired → /login?redirect=…; signed out (here or in another tab) → /. */
export function RequireAuth() {
  const { status, endReason } = useSession();
  const location = useLocation();
  if (status === 'authenticated') return <Outlet />;
  if (status === 'restoring') return null;
  if (endReason === 'logout') return <Navigate to="/" replace />;
  return <Navigate to={loginPath(location.pathname + location.search)} replace />;
}

/** /login and /signup. Goes where the login page would, so the two never race. */
export function GuestOnly() {
  const { status } = useSession();
  const [params] = useSearchParams();
  if (status === 'authenticated') {
    return <Navigate to={safeRedirect(params.get('redirect'))} replace />;
  }
  return <Outlet />;
}
