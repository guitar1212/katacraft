import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ModelSummary } from '@katacraft/shared';
import { ModelKind, ModelStatus } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Pagination } from '@/components/Pagination';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 15;

export default function AdminModels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<{ items: ModelSummary[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<string>(ModelKind.MODEL);
  const [newCreditCost, setNewCreditCost] = useState(1);

  const reload = () => {
    setData(null);
    api
      .get<{ items: ModelSummary[]; total: number }>('/admin/models', {
        query: { q, status: status === 'all' ? undefined : status, page, pageSize: PAGE_SIZE },
      })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  };

  useEffect(reload, [q, status, page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.post<ModelSummary>('/admin/models', {
        name: newName,
        description: '',
        kind: newKind,
        categoryId: null,
        creditCost: newCreditCost,
      });
      setNewDialogOpen(false);
      setNewName('');
      navigate(`/admin/models/${created.id}`);
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('admin.models.title')}</h1>
        <button
          type="button"
          onClick={() => setNewDialogOpen(true)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t('admin.models.newModel')}
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder={t('common.search') ?? ''}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v);
          }}
          options={[
            { value: 'all', label: t('common.all') },
            { value: ModelStatus.DRAFT, label: ModelStatus.DRAFT },
            { value: ModelStatus.PUBLISHED, label: ModelStatus.PUBLISHED },
            { value: ModelStatus.UNPUBLISHED, label: ModelStatus.UNPUBLISHED },
          ]}
        />
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!data ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">{t('admin.models.name')}</th>
                  <th className="px-4 py-2">{t('admin.models.kind')}</th>
                  <th className="px-4 py-2">{t('admin.models.status')}</th>
                  <th className="px-4 py-2">{t('admin.models.creditCost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((m) => (
                  <tr key={m.id} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link to={`/admin/models/${m.id}`} className="font-medium text-brand-700 hover:underline">
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{m.kind}</td>
                    <td className="px-4 py-2 text-gray-600">{m.status}</td>
                    <td className="px-4 py-2 text-gray-600">{m.creditCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen} title={t('admin.models.newModel')}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700">{t('admin.models.name')}</label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">{t('admin.models.kind')}</label>
            <Select
              value={newKind}
              onValueChange={setNewKind}
              options={[
                { value: ModelKind.MODEL, label: ModelKind.MODEL },
                { value: ModelKind.PRINTABLE, label: ModelKind.PRINTABLE },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">{t('admin.models.creditCost')}</label>
            <input
              type="number"
              min={0}
              value={newCreditCost}
              onChange={(e) => setNewCreditCost(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('common.confirm')}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
