import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    api
      .get<{ enabled: boolean }>('/auth/google/status', { skipAuth: true, skipRefresh: true })
      .then((r) => setGoogleEnabled(r.enabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.post<{ accessToken: string; user: UserSummary }>(
        '/auth/login',
        { email, password },
        { skipAuth: true, skipRefresh: true },
      );
      login(res.accessToken, res.user);
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.loginError'));
    } finally {
      setPending(false);
    }
  };

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-lg font-semibold text-gray-900">{t('auth.loginTitle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-700">{t('auth.email')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-700">{t('auth.password')}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {t('auth.loginSubmit')}
        </button>
      </form>

      {googleEnabled && (
        <a
          href={`${apiBase}/auth/google`}
          className="mt-3 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('auth.googleSignin')}
        </a>
      )}

      <p className="mt-4 text-center text-sm text-gray-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          {t('auth.goRegister')}
        </Link>
      </p>
    </div>
  );
}
