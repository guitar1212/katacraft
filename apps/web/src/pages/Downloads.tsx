import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DownloadRecord } from '@katacraft/shared';
import { api, ApiError, fileUrl } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Downloads() {
  const { t } = useTranslation();
  const [downloads, setDownloads] = useState<DownloadRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DownloadRecord[]>('/downloads')
      .then(setDownloads)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('downloads.title')}</h1>
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!downloads ? (
        <LoadingSpinner />
      ) : downloads.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">{t('downloads.empty')}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">{t('admin.models.name')}</th>
                <th className="px-4 py-2">{t('downloads.creditsSpent')}</th>
                <th className="px-4 py-2">{t('downloads.date')}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {downloads.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-gray-900">{d.modelName}</td>
                  <td className="px-4 py-2 text-gray-600">{d.creditsSpent}</td>
                  <td className="px-4 py-2 text-gray-600">{new Date(d.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {d.downloadUrl ? (
                      <a href={fileUrl(d.downloadUrl)} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                        {t('downloads.redownload')}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
