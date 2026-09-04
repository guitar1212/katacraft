import { DownloadMethod, ExportFormat, ModelKind, ModelStatus, RenderPurpose, RenderStatus, Role } from './enums';
import type { ParamSchema, ParamValues } from './param-schema';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  creditsBalance: number;
  language: string;
}

export interface ModelSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: ModelKind;
  status: ModelStatus;
  categoryId: string | null;
  thumbnailUrl: string | null;
  creditCost: number;
  downloadCount: number;
  favoriteCount: number;
  featured: boolean;
}

export interface ModelDetail extends ModelSummary {
  currentVersion: {
    id: string;
    versionNo: number;
    paramSchema: ParamSchema;
  } | null;
}

export interface CreateRenderJobRequest {
  modelVersionId: string;
  params: Record<string, unknown>;
  purpose: RenderPurpose;
  format?: ExportFormat;
}

export interface RenderJobStatus {
  id: string;
  status: RenderStatus;
  purpose: RenderPurpose;
  outputUrl: string | null;
  error: string | null;
}

export interface CreateDownloadRequest {
  modelId: string;
  modelVersionId?: string;
  params?: Record<string, unknown>;
  format?: ExportFormat;
}

export interface DownloadRecord {
  id: string;
  modelId: string;
  modelName: string;
  method: DownloadMethod;
  creditsSpent: number;
  downloadUrl: string | null;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
  balanceAfter: number;
}

export type { ParamSchema, ParamValues };
