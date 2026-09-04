import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ModelSummary } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { ModelCard } from '@/components/ModelCard';
import { CategoryCard } from '@/components/CategoryCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export default function Home() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [models, setModels] = useState<ModelSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, modelsRes] = await Promise.all([
          api.get<Category[]>('/categories'),
          api.get<{ items: ModelSummary[]; total: number }>('/models', {
            query: { sort: 'popular', pageSize: 8 },
          }),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setModels(modelsRes.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('home.categories')}</h2>
        {!categories ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('home.popular')}</h2>
          <Link to="/browse" className="text-sm font-medium text-brand-700 hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>
        {!models ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {models.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
