import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ModelSummary } from '@katacraft/shared';
import { ModelKind } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { ModelCard } from '@/components/ModelCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Pagination } from '@/components/Pagination';
import { Select } from '@/components/ui/Select';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

const PAGE_SIZE = 12;

export default function Browse() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<{ items: ModelSummary[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const q = searchParams.get('q') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const kind = searchParams.get('kind') ?? '';
  const sort = searchParams.get('sort') ?? 'popular';
  const page = Number(searchParams.get('page') ?? '1');

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setModels(null);
    api
      .get<{ items: ModelSummary[]; total: number }>('/models', {
        query: { q, categoryId, kind, sort, page, pageSize: PAGE_SIZE },
      })
      .then((res) => {
        if (!cancelled) setModels(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [q, categoryId, kind, sort, page]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput);
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('browse.title')}</h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('browse.searchPlaceholder') ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </form>

        <Select
          value={categoryId || 'all'}
          onValueChange={(v) => updateParam('categoryId', v === 'all' ? '' : v)}
          options={[{ value: 'all', label: t('browse.allCategories') }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />

        <Select
          value={kind || 'all'}
          onValueChange={(v) => updateParam('kind', v === 'all' ? '' : v)}
          options={[
            { value: 'all', label: t('browse.kindAll') },
            { value: ModelKind.MODEL, label: t('browse.kindModel') },
            { value: ModelKind.PRINTABLE, label: t('browse.kindPrintable') },
          ]}
        />

        <Select
          value={sort}
          onValueChange={(v) => updateParam('sort', v)}
          options={[
            { value: 'popular', label: t('browse.sortPopular') },
            { value: 'newest', label: t('browse.sortNewest') },
          ]}
        />
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!models ? (
        <LoadingSpinner />
      ) : models.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">{t('browse.noResults')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {models.items.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={models.total}
            onPageChange={(p) => {
              const next = new URLSearchParams(searchParams);
              next.set('page', String(p));
              setSearchParams(next);
            }}
          />
        </>
      )}
    </div>
  );
}
