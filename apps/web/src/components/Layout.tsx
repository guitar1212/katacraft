import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isDesignerOrAdmin, useAuthStore } from '@/state/authStore';
import { api } from '@/lib/api';
import { setLanguage } from '@/i18n';
import { useToast } from './ui/Toast';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export function Layout() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout, clear client state regardless
    }
    clear();
    showToast({ title: t('nav.logout'), variant: 'default' });
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-4 text-lg font-bold text-brand-700">
            KataCraft
          </NavLink>
          <nav className="flex flex-1 items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/browse" className={navLinkClass}>
              {t('nav.browse')}
            </NavLink>
            {user && (
              <>
                <NavLink to="/downloads" className={navLinkClass}>
                  {t('nav.downloads')}
                </NavLink>
                <NavLink to="/favorites" className={navLinkClass}>
                  {t('nav.favorites')}
                </NavLink>
              </>
            )}
            {user && isDesignerOrAdmin(user.role) && (
              <NavLink to="/admin" className={navLinkClass}>
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>

          <select
            value={i18n.language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mr-2 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="zh-TW">中文</option>
            <option value="en">English</option>
          </select>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {user.creditsBalance} {t('nav.credits')}
              </span>
              <NavLink to="/settings" className="text-sm text-gray-700 hover:text-brand-700">
                {user.name}
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login" className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                {t('nav.login')}
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                {t('nav.register')}
              </NavLink>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">KataCraft M1 MVP</footer>
    </div>
  );
}
