import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../features/auth/AuthContext';
import { NolaMascot } from '../features/companion/NolaMascot';

/** Shown for the brief moment while Firebase checks for a saved session. */
function LoadingScreen() {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <NolaMascot mood="curious" size={140} />
      <p className="font-display text-2xl">Powering up the station…</p>
    </div>
  );
}

/** Wraps pages that need a signed-in student; everyone else goes to login. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Wraps login and sign-up; a signed-in student is sent on into the app. */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedIn') {
    const from = (location.state as { from?: unknown } | null)?.from;
    return <Navigate to={typeof from === 'string' ? from : '/'} replace />;
  }
  return <Outlet />;
}
