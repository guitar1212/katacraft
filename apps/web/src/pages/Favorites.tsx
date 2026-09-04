import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelSummary } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { ModelCard } from '@/components/ModelCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Favorites() {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ModelSummary[]>('/favorites')
      .then(setModels)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('favorites.title')}</h1>
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!models ? (
        <LoadingSpinner />
      ) : models.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">{t('favorites.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {models.map((m) => (
            <ModelCard key={m.id} model={m} favorited />
          ))}
        </div>
      )}
    </div>
  );
}
