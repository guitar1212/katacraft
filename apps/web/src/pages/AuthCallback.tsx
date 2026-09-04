import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '@katacraft/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';
import { LoadingSpinner } from '@/components/LoadingSpinner';

/** Handles the Google OAuth redirect: GET /auth/google/callback -> /auth/callback?token=... */
export default function AuthCallback() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    setAccessToken(token);
    api
      .get<UserSummary>('/auth/me')
      .then((user) => {
        setUser(user);
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LoadingSpinner label={t('auth.processingCallback') ?? undefined} />;
}
