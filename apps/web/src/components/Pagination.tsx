import { useTranslation } from 'react-i18next';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
      >
        {t('browse.prevPage')}
      </button>
      <span className="text-sm text-gray-600">{t('browse.pageInfo', { page, totalPages })}</span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
      >
        {t('browse.nextPage')}
      </button>
    </div>
  );
}
