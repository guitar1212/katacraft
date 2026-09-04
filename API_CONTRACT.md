# KataCraft API Contract (M1)

Base URL (dev): `http://localhost:3000`. All JSON. Auth via `Authorization: Bearer <accessToken>`; refresh token lives in an httpOnly cookie `kc_refresh`. Types referenced below (`UserSummary`, `ModelSummary`, `ModelDetail`, `RenderJobStatus`, `DownloadRecord`, `CreditLedgerEntry`, `ParamSchema`) come from `packages/shared/src/dto.ts` and `packages/shared/src/enums.ts` — import from `@katacraft/shared`, do not redeclare.

## Auth
- `POST /auth/register` `{email, password, name}` → `{accessToken, user: UserSummary}` — creates user, grants 50-credit signup bonus, sets refresh cookie.
- `POST /auth/login` `{email, password}` → `{accessToken, user: UserSummary}`
- `POST /auth/refresh` (reads `kc_refresh` cookie) → `{accessToken}`
- `POST /auth/logout` → `204`, clears cookie
- `GET /auth/google` → redirects to Google (only registered if `GOOGLE_CLIENT_ID` env set; frontend should hide the "Sign in with Google" button when `GET /auth/google/status` → `{enabled: boolean}` returns false)
- `GET /auth/google/callback` → redirects to `${WEB_ORIGIN}/auth/callback?token=...`
- `GET /auth/me` (auth required) → `UserSummary`

## Users
- `GET /users/me/credits` (auth) → `{balance: number, ledger: CreditLedgerEntry[]}`
- `PATCH /users/me` (auth) `{name?, language?}` → `UserSummary`
- `POST /users/me/password` (auth) `{currentPassword, newPassword}` → `204`

## Categories
- `GET /categories` → `{id, name, sortOrder}[]`

## Models (public browsing)
- `GET /models?kind=MODEL|PRINTABLE&categoryId=&q=&sort=popular|newest&page=&pageSize=` → `{items: ModelSummary[], total: number}` (only `status=PUBLISHED`)
- `GET /models/:slug` → `ModelDetail`
- `POST /models/:id/favorite` (auth) → `{favorited: boolean}` (toggle)
- `GET /favorites` (auth) → `ModelSummary[]`

## Render (customization editor)
- `POST /render` (auth) body `CreateRenderJobRequest` `{modelVersionId, params, purpose: 'PREVIEW'|'FINAL', format?}` → `RenderJobStatus` (`status: QUEUED`). `PREVIEW` never charges credits. `FINAL` is only ever created internally by `POST /downloads`, not called directly by the client with purpose=FINAL (server rejects `purpose=FINAL` on this endpoint with 400 — final renders only happen via the downloads flow so credit deduction and render are atomic).
- `GET /render/:id` (auth) → `RenderJobStatus`. Poll every ~1.5s while `status` is `QUEUED`/`PROCESSING`; `outputUrl` is set when `DONE`.

## Downloads
- `POST /downloads` (auth) body `CreateDownloadRequest` `{modelId, modelVersionId?, params?, format?}` → `{download: DownloadRecord, renderJobId: string | null}`. For `MODEL` kind: checks credit balance, creates a `FINAL` render job, deducts credits and writes the `Download` row once rendering completes (client should poll `GET /render/:renderJobId` then re-fetch the download via `GET /downloads/:id`). For `PRINTABLE` kind: deducts credits and returns `downloadUrl` immediately, `renderJobId: null`.
- `GET /downloads/:id` (auth) → `DownloadRecord`
- `GET /downloads` (auth, "My Downloads") → `DownloadRecord[]`

## Admin (role: DESIGNER can manage models/categories; ADMIN can do everything)
- `GET /admin/models?status=&q=&page=` → `{items: ModelSummary[], total}`
- `POST /admin/models` `{name, description, kind, categoryId, creditCost}` → created `ModelSummary` (status=DRAFT)
- `PATCH /admin/models/:id` `{name?, description?, categoryId?, creditCost?, thumbnailUrl?}` → `ModelSummary`
- `POST /admin/models/:id/versions` `{scadSource, paramSchema: ParamSchema}` → creates new `ModelVersion`, returns `{id, versionNo}`
- `GET /admin/models/:id/versions` → `{id, versionNo, createdAt, createdBy}[]`
- `GET /admin/models/:id/versions/:versionId` → `{id, versionNo, scadSource, paramSchema}`
- `POST /admin/models/:id/publish` `{versionId}` → sets `status=PUBLISHED`, `currentVersionId=versionId`
- `POST /admin/models/:id/unpublish` → `status=UNPUBLISHED`
- `POST /admin/models/:id/printable-files` (multipart) → adds a `PrintableFile`
- `POST /admin/categories` / `PATCH /admin/categories/:id` / `DELETE /admin/categories/:id`
- `GET /admin/users?q=&role=&status=&page=` → `{items: UserSummary[], total}`
- `PATCH /admin/users/:id` `{role?, status?}` → `UserSummary`
- `POST /admin/users/:id/credits` `{delta, reason}` → `CreditLedgerEntry`
- `GET /admin/audit-logs?page=` → `{id, actorId, actorName, action, targetType, targetId, createdAt}[]`
- `GET /admin/settings` / `PATCH /admin/settings` `{signupBonusCredits, defaultDownloadCreditCost}`

## Errors
Standard NestJS HTTP exception JSON: `{statusCode, message, error}`. Param validation failures from the render/download flow return `400` with `message` containing the `ParamValidationError` text (see `@katacraft/shared`'s `sanitizeParamValues`).

## Static files
Rendered/uploaded files are served from `GET /files/:key` (local disk storage in dev; the `StorageService` interface is designed to swap to S3 later without changing this route shape).
