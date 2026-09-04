import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreditLedgerEntry, UserSummary } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';
import { setLanguage } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Select } from '@/components/ui/Select';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [credits, setCredits] = useState<{ balance: number; ledger: CreditLedgerEntry[] } | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ balance: number; ledger: CreditLedgerEntry[] }>('/users/me/credits')
      .then(setCredits)
      .catch(() => {});
  }, [user]);

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    if (user) {
      try {
        const updated = await api.patch<UserSummary>('/users/me', { language: lang });
        setUser(updated);
      } catch {
        // localStorage already updated; ignore server failure for language pref
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await api.patch<UserSummary>('/users/me', { name });
      setUser(updated);
      showToast({ title: t('settings.saved'), variant: 'success' });
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    try {
      await api.post('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      showToast({ title: t('settings.passwordChanged'), variant: 'success' });
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">{t('settings.title')}</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">{t('settings.profile')}</h2>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700">{t('settings.displayName')}</label>
            <input
              type="text"
              value={name}
              disabled={!user}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">{t('settings.language')}</label>
            <Select
              value={i18n.language}
              onValueChange={handleLanguageChange}
              options={[
                { value: 'zh-TW', label: '中文' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>
          {user && (
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {t('settings.save')}
            </button>
          )}
        </form>
      </section>

      {user && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-800">{t('settings.changePassword')}</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-gray-700">{t('settings.currentPassword')}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700">{t('settings.newPassword')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {t('settings.changePasswordSubmit')}
            </button>
          </form>
        </section>
      )}

      {user && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-800">{t('settings.creditsBalance')}</h2>
          {!credits ? (
            <LoadingSpinner />
          ) : (
            <>
              <p className="mb-4 text-2xl font-bold text-brand-700">{credits.balance}</p>
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">{t('settings.creditsLedger')}</h3>
              <div className="max-h-64 overflow-y-auto rounded-md border border-gray-100">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {credits.ledger.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-3 py-2 text-gray-600">{new Date(entry.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-600">{entry.reason}</td>
                        <td className={`px-3 py-2 text-right font-medium ${entry.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.delta >= 0 ? '+' : ''}
                          {entry.delta}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">{entry.balanceAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-800">{t('settings.plans')}</h2>
        <p className="mb-4 text-xs text-gray-500">{t('settings.plansNotice')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {['Basic', 'Pro', 'Studio'].map((plan) => (
            <div key={plan} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5 opacity-60">
              <span className="absolute right-3 top-3 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                {t('settings.plansComingSoon')}
              </span>
              <h3 className="text-base font-semibold text-gray-800">{plan}</h3>
              <p className="mt-1 text-sm text-gray-400">—</p>
              <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                {t('settings.plansComingSoon')}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
