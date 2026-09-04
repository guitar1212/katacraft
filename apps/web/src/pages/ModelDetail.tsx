import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { DownloadRecord, ModelDetail as ModelDetailType, ParamValues, RenderJobStatus } from '@katacraft/shared';
import { ExportFormat, ModelKind, RenderStatus } from '@katacraft/shared';
import { api, ApiError, fileUrl } from '@/lib/api';
import { pollRenderJob } from '@/lib/renderPoll';
import { useAuthStore } from '@/state/authStore';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ParamForm, defaultParamValues } from '@/components/ParamForm';
import { Select } from '@/components/ui/Select';
import { Heart, Download as DownloadIcon } from '@/components/ui/icons';
import { StlViewer, type StlViewerHandle, type CameraPreset } from '@/three/StlViewer';

export default function ModelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [model, setModel] = useState<ModelDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<ParamValues>({});
  const [favorited, setFavorited] = useState(false);

  const [previewJob, setPreviewJob] = useState<RenderJobStatus | null>(null);
  const [previewPending, setPreviewPending] = useState(false);

  const [format, setFormat] = useState<string>(ExportFormat.STL);
  const [downloadPending, setDownloadPending] = useState(false);
  const [downloadRecord, setDownloadRecord] = useState<DownloadRecord | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const viewerRef = useRef<StlViewerHandle>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setModel(null);
    setError(null);
    api
      .get<ModelDetailType>(`/models/${slug}`)
      .then((data) => {
        if (cancelled) return;
        setModel(data);
        if (data.currentVersion) setParamValues(defaultParamValues(data.currentVersion.paramSchema));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Determine initial favorite state (no `favorited` flag on ModelSummary/ModelDetail
  // per the API contract, so we cross-reference the user's favorites list).
  useEffect(() => {
    if (!user || !model) return;
    let cancelled = false;
    api
      .get<{ id: string }[]>('/favorites')
      .then((favs) => {
        if (!cancelled) setFavorited(favs.some((f) => f.id === model.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, model]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleParamChange = (key: string, value: string | number | boolean) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleFavorite = async () => {
    if (!model) return;
    if (!user) {
      showToast({ title: t('auth.loginTitle'), variant: 'default' });
      return;
    }
    try {
      const res = await api.post<{ favorited: boolean }>(`/models/${model.id}/favorite`);
      setFavorited(res.favorited);
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  const handleGeneratePreview = async () => {
    if (!model?.currentVersion) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPreviewPending(true);
    setPreviewJob(null);
    try {
      const job = await api.post<RenderJobStatus>('/render', {
        modelVersionId: model.currentVersion.id,
        params: paramValues,
        purpose: 'PREVIEW',
      });
      setPreviewJob(job);
      const final = await pollRenderJob(job.id, setPreviewJob, controller.signal);
      if (final.status === RenderStatus.FAILED) {
        showToast({ title: t('model.previewFailed'), description: final.error ?? undefined, variant: 'error' });
      }
    } catch (err) {
      showToast({ title: t('model.previewFailed'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setPreviewPending(false);
    }
  };

  const handleCameraPreset = (preset: CameraPreset) => viewerRef.current?.setCameraPreset(preset);

  const handleDownload = async () => {
    if (!model) return;
    if (!user) {
      showToast({ title: t('auth.loginTitle'), variant: 'default' });
      return;
    }
    setDownloadPending(true);
    setDownloadError(null);
    setDownloadRecord(null);
    try {
      const body =
        model.kind === ModelKind.MODEL
          ? {
              modelId: model.id,
              modelVersionId: model.currentVersion?.id,
              params: paramValues,
              format,
            }
          : { modelId: model.id };
      const res = await api.post<{ download: DownloadRecord; renderJobId: string | null }>('/downloads', body);
      if (res.renderJobId) {
        await pollRenderJob(res.renderJobId, () => {});
        const finalRecord = await api.get<DownloadRecord>(`/downloads/${res.download.id}`);
        setDownloadRecord(finalRecord);
      } else {
        setDownloadRecord(res.download);
      }
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setDownloadPending(false);
    }
  };

  if (error) return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!model) return <LoadingSpinner label={t('common.loading') ?? undefined} />;

  const previewUrl = previewJob?.status === RenderStatus.DONE ? fileUrl(previewJob.outputUrl) : null;
  const balance = user?.creditsBalance ?? 0;
  const insufficientCredits = model.kind === ModelKind.MODEL && balance < model.creditCost;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-start justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{model.name}</h1>
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${
              favorited ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart filled={favorited} /> {favorited ? t('model.favorited') : t('model.favorite')}
          </button>
        </div>
        <p className="mb-4 whitespace-pre-line text-sm text-gray-600">{model.description}</p>

        {model.kind === ModelKind.PRINTABLE ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-4 text-sm text-gray-500">{t('model.printableNotice')}</p>
            {model.thumbnailUrl && (
              <img src={fileUrl(model.thumbnailUrl)} alt={model.name} className="mb-4 w-full rounded-md object-cover" />
            )}
            <DownloadPanel
              model={model}
              balance={balance}
              insufficientCredits={insufficientCredits}
              format={format}
              setFormat={setFormat}
              downloadPending={downloadPending}
              downloadRecord={downloadRecord}
              downloadError={downloadError}
              onDownload={handleDownload}
              hideFormatSelect
            />
          </div>
        ) : (
          model.currentVersion && (
            <>
              <ParamForm schema={model.currentVersion.paramSchema} values={paramValues} onChange={handleParamChange} />
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                <DownloadPanel
                  model={model}
                  balance={balance}
                  insufficientCredits={insufficientCredits}
                  format={format}
                  setFormat={setFormat}
                  downloadPending={downloadPending}
                  downloadRecord={downloadRecord}
                  downloadError={downloadError}
                  onDownload={handleDownload}
                />
              </div>
            </>
          )
        )}
      </div>

      {model.kind === ModelKind.MODEL && model.currentVersion && (
        <div className="flex flex-col">
          <div className="relative h-[420px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <StlViewer ref={viewerRef} url={previewUrl} className="h-full w-full" />
            {!previewUrl && !previewPending && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                {t('model.viewerEmpty')}
              </div>
            )}
            {previewPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <LoadingSpinner
                  label={
                    previewJob?.status === RenderStatus.PROCESSING ? t('model.processing') ?? undefined : t('model.queued') ?? undefined
                  }
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            {(['isometric', 'front', 'top', 'side'] as CameraPreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleCameraPreset(preset)}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                {t(`model.camera${preset[0].toUpperCase()}${preset.slice(1)}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={previewPending}
            className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {previewPending ? t('model.generating') : t('model.generatePreview')}
          </button>
        </div>
      )}
    </div>
  );
}

interface DownloadPanelProps {
  model: ModelDetailType;
  balance: number;
  insufficientCredits: boolean;
  format: string;
  setFormat: (f: string) => void;
  downloadPending: boolean;
  downloadRecord: DownloadRecord | null;
  downloadError: string | null;
  onDownload: () => void;
  hideFormatSelect?: boolean;
}

function DownloadPanel({
  model,
  balance,
  insufficientCredits,
  format,
  setFormat,
  downloadPending,
  downloadRecord,
  downloadError,
  onDownload,
  hideFormatSelect,
}: DownloadPanelProps) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-gray-800">{t('model.downloadPanel')}</h2>

      {!hideFormatSelect && (
        <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
          <span>{t('model.exportFormat')}</span>
          <Select
            value={format}
            onValueChange={setFormat}
            options={[
              { value: ExportFormat.STL, label: 'STL' },
              { value: ExportFormat.THREE_MF, label: '3MF' },
              { value: ExportFormat.OBJ, label: 'OBJ' },
            ]}
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-600">{t('model.downloadCost')}</span>
        <span className="font-medium text-gray-900">
          {model.creditCost} {t('model.credits')}
        </span>
      </div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-600">{t('model.yourBalance')}</span>
        <span className={`font-medium ${insufficientCredits ? 'text-red-600' : 'text-gray-900'}`}>
          {balance} {t('model.credits')}
        </span>
      </div>

      {insufficientCredits && <p className="mb-3 text-xs text-red-600">{t('model.insufficientCredits')}</p>}
      {downloadError && <p className="mb-3 text-xs text-red-600">{downloadError}</p>}

      <button
        type="button"
        onClick={onDownload}
        disabled={downloadPending || insufficientCredits}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <DownloadIcon />
        {downloadPending ? t('model.generating') : t('model.download')}
      </button>

      {downloadRecord?.downloadUrl && (
        <a
          href={fileUrl(downloadRecord.downloadUrl)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-md border border-green-300 bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-100"
        >
          {t('model.downloadReady')} — {t('model.downloadLink')}
        </a>
      )}
    </div>
  );
}
