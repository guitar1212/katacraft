import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ModelSummary } from '@katacraft/shared';
import { fileUrl } from '@/lib/api';
import { Heart, Download } from './ui/icons';

interface ModelCardProps {
  model: ModelSummary;
  favorited?: boolean;
}

export function ModelCard({ model, favorited }: ModelCardProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/models/${model.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        {model.thumbnailUrl ? (
          <img
            src={fileUrl(model.thumbnailUrl)}
            alt={model.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">No Image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-medium text-gray-900">{model.name}</h3>
          {favorited && <Heart filled className="flex-shrink-0 text-red-500" />}
        </div>
        <p className="line-clamp-2 text-xs text-gray-500">{model.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Download className="text-gray-400" /> {model.downloadCount}
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
            {model.creditCost} {t('model.credits')}
          </span>
        </div>
      </div>
    </Link>
  );
}
