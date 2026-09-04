import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import type { ModelSummary, RenderJobStatus } from '@katacraft/shared';
import { ModelKind, ModelStatus, ParamSchemaSchema, RenderStatus } from '@katacraft/shared';
import { api, ApiError, fileUrl } from '@/lib/api';
import { pollRenderJob } from '@/lib/renderPoll';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { StlViewer } from '@/three/StlViewer';

interface VersionSummary {
  id: string;
  versionNo: number;
  createdAt: string;
  createdBy?: string;
}

interface VersionDetail {
  id: string;
  versionNo: number;
  scadSource: string;
  paramSchema: unknown;
}

interface Category {
  id: string;
  name: string;
}

const DEFAULT_SCAD = '// New model - write your OpenSCAD source here\ncube([10, 10, 10]);\n';
const DEFAULT_SCHEMA = JSON.stringify({ fields: [] }, null, 2);

export default function AdminModelEditor() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [model, setModel] = useState<ModelSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('info');

  // Basic info form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [creditCost, setCreditCost] = useState(1);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Source / param schema editor state
  const [scadSource, setScadSource] = useState(DEFAULT_SCAD);
  const [schemaText, setSchemaText] = useState(DEFAULT_SCHEMA);
  const [savingVersion, setSavingVersion] = useState(false);

  // Versions
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [viewingVersion, setViewingVersion] = useState<VersionDetail | null>(null);
  const [publishVersionId, setPublishVersionId] = useState<string>('');

  // Test preview
  const [previewJob, setPreviewJob] = useState<RenderJobStatus | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Printable file upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const schemaValidation = useMemo(() => {
    try {
      const parsed = JSON.parse(schemaText);
      const result = ParamSchemaSchema.safeParse(parsed);
      if (result.success) return { valid: true as const, message: t('admin.models.paramSchemaValid') };
      return {
        valid: false as const,
        message: `${t('admin.models.paramSchemaInvalid')}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      };
    } catch (e) {
      return { valid: false as const, message: `${t('admin.models.paramSchemaInvalid')}: ${(e as Error).message}` };
    }
  }, [schemaText, t]);

  const loadModel = () => {
    if (!id) return;
    // NOTE: the API contract does not explicitly document a single-resource
    // `GET /admin/models/:id`, only the list endpoint and PATCH/:id. Since a
    // PATCH-by-id implies a matching read-by-id resource, we call it here;
    // if the backend doesn't expose it, this call will 404 and surface an error.
    api
      .get<ModelSummary>(`/admin/models/${id}`)
      .then((m) => {
        setModel(m);
        setName(m.name);
        setDescription(m.description);
        setCategoryId(m.categoryId ?? '');
        setCreditCost(m.creditCost);
        setThumbnailUrl(m.thumbnailUrl ?? '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : String(err)));
  };

  const loadVersions = () => {
    if (!id) return;
    api
      .get<VersionSummary[]>(`/admin/models/${id}/versions`)
      .then((list) => {
        setVersions(list);
        if (list.length > 0) setPublishVersionId(list[list.length - 1].id);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadModel();
    loadVersions();
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingInfo(true);
    try {
      const updated = await api.patch<ModelSummary>(`/admin/models/${id}`, {
        name,
        description,
        categoryId: categoryId || null,
        creditCost,
        thumbnailUrl: thumbnailUrl || null,
      });
      setModel(updated);
      showToast({ title: t('admin.models.modelSaved'), variant: 'success' });
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveVersion = async (): Promise<{ id: string } | null> => {
    if (!id) return null;
    if (!schemaValidation.valid) {
      showToast({ title: t('admin.models.paramSchemaInvalid'), variant: 'error' });
      return null;
    }
    setSavingVersion(true);
    try {
      const created = await api.post<{ id: string; versionNo: number }>(`/admin/models/${id}/versions`, {
        scadSource,
        paramSchema: JSON.parse(schemaText),
      });
      showToast({ title: t('admin.models.modelSaved'), variant: 'success' });
      loadVersions();
      return created;
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
      return null;
    } finally {
      setSavingVersion(false);
    }
  };

  const handleViewVersion = async (versionId: string) => {
    if (!id) return;
    try {
      const detail = await api.get<VersionDetail>(`/admin/models/${id}/versions/${versionId}`);
      setViewingVersion(detail);
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  const handlePublish = async () => {
    if (!id || !publishVersionId) return;
    try {
      const updated = await api.post<ModelSummary>(`/admin/models/${id}/publish`, { versionId: publishVersionId });
      setModel(updated);
      showToast({ title: t('admin.models.publish'), variant: 'success' });
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    try {
      const updated = await api.post<ModelSummary>(`/admin/models/${id}/unpublish`);
      setModel(updated);
      showToast({ title: t('admin.models.unpublish'), variant: 'success' });
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    }
  };

  // "Test Preview" saves the current editor contents as a new version (so
  // the render worker has a persisted modelVersionId to work from), then
  // runs the same preview render + poll flow the member-facing editor uses,
  // scoped to that just-saved version, using its schema's default params.
  const handleTestPreview = async () => {
    const saved = await handleSaveVersion();
    if (!saved) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPreviewPending(true);
    setPreviewJob(null);
    try {
      let params: Record<string, unknown> = {};
      try {
        const schema = ParamSchemaSchema.parse(JSON.parse(schemaText));
        params = Object.fromEntries(schema.fields.map((f) => [f.key, f.default]));
      } catch {
        // fall through with empty params
      }
      const job = await api.post<RenderJobStatus>('/render', {
        modelVersionId: saved.id,
        params,
        purpose: 'PREVIEW',
      });
      setPreviewJob(job);
      await pollRenderJob(job.id, setPreviewJob, controller.signal);
    } catch (err) {
      showToast({ title: t('model.previewFailed'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setPreviewPending(false);
    }
  };

  const handleUploadPrintableFile = async () => {
    if (!id || !uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      await api.post(`/admin/models/${id}/printable-files`, formData);
      showToast({ title: t('admin.models.uploadFile'), variant: 'success' });
      setUploadFile(null);
    } catch (err) {
      showToast({ title: t('common.error'), description: err instanceof ApiError ? err.message : String(err), variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  if (error) return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!model) return <LoadingSpinner />;

  const previewUrl = previewJob?.status === RenderStatus.DONE ? fileUrl(previewJob.outputUrl) : null;

  const infoTab = (
    <form onSubmit={handleSaveInfo} className="max-w-lg space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="rounded bg-gray-100 px-2 py-0.5">{model.kind}</span>
        <span className="rounded bg-gray-100 px-2 py-0.5">{model.status}</span>
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-700">{t('admin.models.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-700">{t('admin.models.description')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700">{t('admin.models.category')}</label>
        <Select
          value={categoryId || 'none'}
          onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}
          options={[{ value: 'none', label: t('common.all') }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-700">{t('admin.models.creditCost')}</label>
        <input
          type="number"
          min={0}
          value={creditCost}
          onChange={(e) => setCreditCost(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-700">Thumbnail URL</label>
        <input
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button type="submit" disabled={savingInfo} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {t('common.save')}
      </button>

      <div className="flex gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={handlePublish}
          disabled={!publishVersionId}
          className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          {t('admin.models.publish')}
        </button>
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={model.status !== ModelStatus.PUBLISHED}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {t('admin.models.unpublish')}
        </button>
      </div>
    </form>
  );

  const sourceTab = (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin.models.scadSource')}</label>
        <div className="overflow-hidden rounded-md border border-gray-300">
          <Editor
            height="320px"
            defaultLanguage="plaintext"
            value={scadSource}
            onChange={(v) => setScadSource(v ?? '')}
            theme="light"
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin.models.paramSchemaJson')}</label>
        <textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
        />
        <p className={`mt-1 text-xs ${schemaValidation.valid ? 'text-green-600' : 'text-red-600'}`}>{schemaValidation.message}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSaveVersion}
          disabled={savingVersion || !schemaValidation.valid}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {t('admin.models.saveVersion')}
        </button>
        <button
          type="button"
          onClick={handleTestPreview}
          disabled={previewPending || savingVersion || !schemaValidation.valid}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('admin.models.testPreview')}
        </button>
      </div>

      {(previewPending || previewUrl) && (
        <div className="relative h-72 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <StlViewer url={previewUrl} className="h-full w-full" />
          {previewPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <LoadingSpinner label={previewJob?.status ?? undefined} />
            </div>
          )}
        </div>
      )}
      {previewJob?.status === RenderStatus.FAILED && <p className="text-sm text-red-600">{previewJob.error}</p>}
    </div>
  );

  const versionsTab = (
    <div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">{t('admin.models.versionNo')}</th>
            <th className="px-3 py-2">{t('admin.models.createdAt')}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="px-3 py-2">v{v.versionNo}</td>
              <td className="px-3 py-2 text-gray-600">{new Date(v.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2 text-right">
                <button type="button" onClick={() => handleViewVersion(v.id)} className="font-medium text-brand-700 hover:underline">
                  {t('common.edit')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {viewingVersion && (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">v{viewingVersion.versionNo}</h3>
            <button type="button" onClick={() => setViewingVersion(null)} className="text-xs text-gray-500 hover:text-gray-800">
              {t('common.close')}
            </button>
          </div>
          <pre className="max-h-64 overflow-auto rounded bg-white p-3 text-xs">{viewingVersion.scadSource}</pre>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(viewingVersion.paramSchema, null, 2)}</pre>
        </div>
      )}
    </div>
  );

  const printableTab = (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-gray-500">{t('admin.models.printableFiles')}</p>
      <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="text-sm" />
      <button
        type="button"
        onClick={handleUploadPrintableFile}
        disabled={!uploadFile || uploading}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {t('admin.models.uploadFile')}
      </button>
    </div>
  );

  const items =
    model.kind === ModelKind.MODEL
      ? [
          { value: 'info', label: t('admin.models.basicInfo'), content: infoTab },
          { value: 'source', label: t('admin.models.scadSource'), content: sourceTab },
          { value: 'versions', label: t('admin.models.versionHistory'), content: versionsTab },
        ]
      : [
          { value: 'info', label: t('admin.models.basicInfo'), content: infoTab },
          { value: 'printable', label: t('admin.models.printableFiles'), content: printableTab },
        ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">
        {t('admin.models.editModel')} — {model.name}
      </h1>
      <Tabs items={items} value={tab} onValueChange={setTab} />
    </div>
  );
}
