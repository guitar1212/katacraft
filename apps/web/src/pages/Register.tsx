import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.post<{ accessToken: string; user: UserSummary }>(
        '/auth/register',
        { email, password, name },
        { skipAuth: true, skipRefresh: true },
      );
      login(res.accessToken, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.registerError'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-lg font-semibold text-gray-900">{t('auth.registerTitle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-700">{t('auth.name')}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
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
            minLength={8}
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
          {t('auth.registerSubmit')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          {t('auth.goLogin')}
        </Link>
      </p>
    </div>
  );
}
