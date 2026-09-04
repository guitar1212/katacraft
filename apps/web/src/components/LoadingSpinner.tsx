import { Spinner } from './ui/icons';

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
      <Spinner />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
