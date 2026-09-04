import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isDesignerOrAdmin, useAuthStore } from '@/state/authStore';

/** Redirects to /login when the user isn't authenticated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const location = useLocation();

  if (!initialized) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

/**
 * Client-side UX guard only: hides admin routes from members in the UI.
 * Real authorization is enforced server-side by RBAC guards on every
 * /admin/* endpoint — this check exists purely so a member doesn't land
 * on a broken/empty admin screen, not as a security boundary.
 */
export function RequireAdminRole({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) return null;
  if (!user || !isDesignerOrAdmin(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
