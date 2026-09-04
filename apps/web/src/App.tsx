import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { UserSummary } from '@katacraft/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';
import { Layout } from '@/components/Layout';
import { RequireAuth, RequireAdminRole } from '@/components/RouteGuards';

import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import ModelDetail from '@/pages/ModelDetail';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AuthCallback from '@/pages/AuthCallback';
import Downloads from '@/pages/Downloads';
import Favorites from '@/pages/Favorites';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

import AdminLayout from '@/admin/AdminLayout';
import AdminModels from '@/admin/AdminModels';
import AdminModelEditor from '@/admin/AdminModelEditor';
import AdminCategories from '@/admin/AdminCategories';
import AdminUsers from '@/admin/AdminUsers';
import AdminAuditLog from '@/admin/AdminAuditLog';
import AdminSettings from '@/admin/AdminSettings';

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  // On boot, if we have a (possibly stale) access token, resolve the current
  // session via GET /auth/me. The api client's 401 handling will transparently
  // try POST /auth/refresh once before giving up.
  useEffect(() => {
    if (!accessToken) {
      setInitialized(true);
      return;
    }
    api
      .get<UserSummary>('/auth/me')
      .then(setUser)
      .catch(() => clear())
      .finally(() => setInitialized(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/models/:slug" element={<ModelDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/downloads"
          element={
            <RequireAuth>
              <Downloads />
            </RequireAuth>
          }
        />
        <Route
          path="/favorites"
          element={
            <RequireAuth>
              <Favorites />
            </RequireAuth>
          }
        />
        <Route path="/settings" element={<Settings />} />

        <Route
          path="/admin"
          element={
            <RequireAdminRole>
              <AdminLayout />
            </RequireAdminRole>
          }
        >
          <Route index element={<Navigate to="models" replace />} />
          <Route path="models" element={<AdminModels />} />
          <Route path="models/:id" element={<AdminModelEditor />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
