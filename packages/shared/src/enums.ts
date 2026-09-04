export const Role = {
  MEMBER: 'MEMBER',
  DESIGNER: 'DESIGNER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ModelKind = {
  MODEL: 'MODEL',
  PRINTABLE: 'PRINTABLE',
} as const;
export type ModelKind = (typeof ModelKind)[keyof typeof ModelKind];

export const ModelStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
} as const;
export type ModelStatus = (typeof ModelStatus)[keyof typeof ModelStatus];

export const RenderPurpose = {
  PREVIEW: 'PREVIEW',
  FINAL: 'FINAL',
} as const;
export type RenderPurpose = (typeof RenderPurpose)[keyof typeof RenderPurpose];

export const RenderStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;
export type RenderStatus = (typeof RenderStatus)[keyof typeof RenderStatus];

export const DownloadMethod = {
  DOWNLOAD: 'DOWNLOAD',
  COMPANION_IMPORT: 'COMPANION_IMPORT',
} as const;
export type DownloadMethod = (typeof DownloadMethod)[keyof typeof DownloadMethod];

export const ExportFormat = {
  STL: 'stl',
  THREE_MF: '3mf',
  OBJ: 'obj',
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export const CreditReason = {
  SIGNUP_BONUS: 'signup_bonus',
  DOWNLOAD: 'download',
  ADMIN_ADJUST: 'admin_adjust',
  REFUND: 'refund',
} as const;
export type CreditReason = (typeof CreditReason)[keyof typeof CreditReason];
