import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export default function AdminCategories() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Record<string, { name: string; sortOrder: number }>>({});

  const reload = () => {
    api
      .get<Category[]>('/categories')
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  };

  useEffect(reload, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/admin/categories', { name: newName, sortOrder: newSortOrder });
      setNewName('');
      setNewSortOrder(0);
      reload();
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: Category) => setEditing((prev) => ({ ...prev, [c.id]: { name: c.name, sortOrder: c.sortOrder } }));

  const handleSaveEdit = async (id: string) => {
    const draft = editing[id];
    if (!draft) return;
    try {
      await api.patch(`/admin/categories/${id}`, draft);
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      reload();
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      reload();
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('admin.categories.title')}</h1>
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleCreate} className="mb-6 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('admin.categories.name')}</label>
          <input required value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{t('admin.categories.sortOrder')}</label>
          <input
            type="number"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(Number(e.target.value))}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" disabled={creating} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {t('admin.categories.newCategory')}
        </button>
      </form>

      {!categories ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">{t('admin.categories.name')}</th>
                <th className="px-4 py-2">{t('admin.categories.sortOrder')}</th>
                <th className="px-4 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((c) => {
                const draft = editing[c.id];
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      {draft ? (
                        <input
                          value={draft.name}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id], name: e.target.value } }))}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {draft ? (
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id], sortOrder: Number(e.target.value) } }))
                          }
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        c.sortOrder
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      {draft ? (
                        <button type="button" onClick={() => handleSaveEdit(c.id)} className="font-medium text-brand-700 hover:underline">
                          {t('common.save')}
                        </button>
                      ) : (
                        <button type="button" onClick={() => startEdit(c)} className="font-medium text-brand-700 hover:underline">
                          {t('common.edit')}
                        </button>
                      )}
                      <button type="button" onClick={() => handleDelete(c.id)} className="font-medium text-red-600 hover:underline">
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
