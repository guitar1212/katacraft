import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

interface Settings {
  signupBonusCredits: number;
  defaultDownloadCreditCost: number;
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Settings>('/admin/settings')
      .then(setSettings)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.patch<Settings>('/admin/settings', settings);
      setSettings(updated);
      showToast({ title: t('settings.saved'), variant: 'success' });
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!settings) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('admin.settings.title')}</h1>
      <form onSubmit={handleSave} className="max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm text-gray-700">{t('admin.settings.signupBonusCredits')}</label>
          <input
            type="number"
            min={0}
            value={settings.signupBonusCredits}
            onChange={(e) => setSettings({ ...settings, signupBonusCredits: Number(e.target.value) })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-700">{t('admin.settings.defaultDownloadCreditCost')}</label>
          <input
            type="number"
            min={0}
            value={settings.defaultDownloadCreditCost}
            onChange={(e) => setSettings({ ...settings, defaultDownloadCreditCost: Number(e.target.value) })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {t('common.save')}
        </button>
      </form>
    </div>
  );
}
