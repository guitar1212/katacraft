import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Pagination } from '@/components/Pagination';

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

const PAGE_SIZE = 25;

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setEntries(null);
    api
      .get<AuditLogEntry[] | { items: AuditLogEntry[]; total: number }>('/admin/audit-logs', { query: { page } })
      .then((res) => {
        if (Array.isArray(res)) {
          setEntries(res);
          setTotal(res.length);
        } else {
          setEntries(res.items);
          setTotal(res.total);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  }, [page]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{t('admin.auditLog.title')}</h1>
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!entries ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">{t('admin.auditLog.actor')}</th>
                  <th className="px-4 py-2">{t('admin.auditLog.action')}</th>
                  <th className="px-4 py-2">{t('admin.auditLog.target')}</th>
                  <th className="px-4 py-2">{t('admin.auditLog.time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-gray-900">{e.actorName}</td>
                    <td className="px-4 py-2 text-gray-600">{e.action}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {e.targetType} #{e.targetId}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
