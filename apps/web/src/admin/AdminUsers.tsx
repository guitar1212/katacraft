import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserSummary } from '@katacraft/shared';
import { Role } from '@katacraft/shared';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Pagination } from '@/components/Pagination';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';

// The API contract's UserSummary DTO doesn't carry a `status` field even
// though GET /admin/users accepts a `status` filter and PATCH accepts a
// `status` body field (suspend/unsuspend). We extend it locally as optional
// so the admin list still renders correctly whether or not the field is present.
type AdminUserRow = UserSummary & { status?: 'ACTIVE' | 'SUSPENDED' | string };

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [data, setData] = useState<{ items: AdminUserRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);

  const [creditDialogUser, setCreditDialogUser] = useState<AdminUserRow | null>(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const reload = () => {
    setData(null);
    api
      .get<{ items: AdminUserRow[]; total: number }>('/admin/users', {
        query: { q, role: role === 'all' ? undefined : role, page, pageSize: PAGE_SIZE },
      })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  };

  useEffect(reload, [q, role, page]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      reload();
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  const handleToggleSuspend = async (user: AdminUserRow) => {
    const nextStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await api.patch(`/admin/users/${user.id}`, { status: nextStatus });
      reload();
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  const openCreditDialog = (user: AdminUserRow) => {
    setCreditDialogUser(user);
    setDelta(0);
    setReason('');
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditDialogUser) return;
    setAdjusting(true);
    try {
      await api.post(`/admin/users/${creditDialogUser.id}/credits`, { delta, reason });
      setCreditDialogUser(null);
      reload();
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('admin.users.title')}</h1>

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
          value={role}
          onValueChange={(v) => {
            setPage(1);
            setRole(v);
          }}
          options={[
            { value: 'all', label: t('common.all') },
            { value: Role.MEMBER, label: Role.MEMBER },
            { value: Role.DESIGNER, label: Role.DESIGNER },
            { value: Role.ADMIN, label: Role.ADMIN },
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
                  <th className="px-4 py-2">{t('admin.users.name')}</th>
                  <th className="px-4 py-2">{t('admin.users.email')}</th>
                  <th className="px-4 py-2">{t('admin.users.role')}</th>
                  <th className="px-4 py-2">{t('nav.credits')}</th>
                  <th className="px-4 py-2">{t('admin.users.status')}</th>
                  <th className="px-4 py-2 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 text-gray-900">{u.name}</td>
                    <td className="px-4 py-2 text-gray-600">{u.email}</td>
                    <td className="px-4 py-2">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)} options={[
                        { value: Role.MEMBER, label: Role.MEMBER },
                        { value: Role.DESIGNER, label: Role.DESIGNER },
                        { value: Role.ADMIN, label: Role.ADMIN },
                      ]} />
                    </td>
                    <td className="px-4 py-2 text-gray-600">{u.creditsBalance}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${u.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.status ?? 'ACTIVE'}
                      </span>
                    </td>
                    <td className="space-x-2 px-4 py-2 text-right">
                      <button type="button" onClick={() => openCreditDialog(u)} className="font-medium text-brand-700 hover:underline">
                        {t('admin.users.adjustCredits')}
                      </button>
                      <button type="button" onClick={() => handleToggleSuspend(u)} className="font-medium text-gray-600 hover:underline">
                        {u.status === 'SUSPENDED' ? t('admin.users.unsuspend') : t('admin.users.suspend')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!creditDialogUser} onOpenChange={(o) => !o && setCreditDialogUser(null)} title={t('admin.users.adjustCredits')}>
        <form onSubmit={handleAdjustCredits} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700">{t('admin.users.delta')}</label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">{t('admin.users.reason')}</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            disabled={adjusting}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('common.confirm')}
          </button>
        </form>
      </Dialog>
    </div>
  );
}
