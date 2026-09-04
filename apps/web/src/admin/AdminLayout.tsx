import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/state/authStore';
import { Role } from '@katacraft/shared';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function AdminLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;

  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-1">
        <NavLink to="/admin/models" className={linkClass}>
          {t('admin.nav.models')}
        </NavLink>
        <NavLink to="/admin/categories" className={linkClass}>
          {t('admin.nav.categories')}
        </NavLink>
        {isAdmin && (
          <>
            <NavLink to="/admin/users" className={linkClass}>
              {t('admin.nav.users')}
            </NavLink>
            <NavLink to="/admin/audit-log" className={linkClass}>
              {t('admin.nav.auditLog')}
            </NavLink>
            <NavLink to="/admin/settings" className={linkClass}>
              {t('admin.nav.settings')}
            </NavLink>
          </>
        )}
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
