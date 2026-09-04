# KataCraft Web (M1 MVP)

Member-facing + admin frontend for KataCraft, a 3D-printing customization SaaS. React 18 + TypeScript + Vite, styled with Tailwind CSS and Radix UI primitives, state via Zustand, i18n via i18next (zh-TW default, en), 3D preview via Three.js + STLLoader, admin `.scad` source editing via Monaco.

This app talks to the NestJS API in `apps/api` (see `../../API_CONTRACT.md`) and imports shared types/schemas directly from `packages/shared` (see `../../packages/shared`) — no npm package build step, resolved via a Vite alias.

## Getting started

```bash
cd apps/web
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if the API isn't on localhost:3000
npm run dev
```

The dev server runs on `http://localhost:5173`. It expects the API from `apps/api` to be running (see the repo root README for how to bring up Postgres/Redis/OpenSCAD via Docker Compose) — without a live backend, pages will show loading/error states since there is nothing to fetch from.

## Scripts

- `npm run dev` — Vite dev server with HMR
- `npm run build` — type-checks (`tsc --noEmit`) then produces a production build in `dist/`
- `npm run preview` — serves the built `dist/` locally
- `npm run typecheck` — `tsc --noEmit` only

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the KataCraft API |

## Project layout

```
src/
  pages/        Member-facing routes: Home, Browse, ModelDetail (editor), Login, Register,
                 AuthCallback, Downloads, Favorites, Settings, NotFound
  admin/         /admin/* routes: AdminLayout, AdminModels, AdminModelEditor (Monaco + param
                 schema JSON), AdminCategories, AdminUsers, AdminAuditLog, AdminSettings
  components/    Shared UI: Layout/nav, ModelCard, CategoryCard, ParamForm (dynamic param
                 form), Pagination, RouteGuards, ui/ (Radix wrappers: Select, Switch,
                 Collapsible, Tabs, Dialog, Toast, icons)
  three/         StlViewer.tsx — Three.js scene + OrbitControls + STLLoader + camera presets
  state/         Zustand stores (authStore: accessToken + UserSummary)
  lib/           api.ts (fetch wrapper with auto 401 -> refresh -> retry), renderPoll.ts
  i18n/          i18next setup + locales/{zh-TW,en}.json
```

## Notes / scope

- Per the approved M1 plan, this app deliberately does **not** implement: image-to-vector tracing, thin-wall detection, a Desktop Companion UI, STEP export, or a real payment flow. The Settings page's "Plans" section is static, disabled "Coming soon" cards only — no API calls.
- `/admin/*` role gating (`DESIGNER`/`ADMIN` only) is a **client-side UX guard**, not a security boundary — the real enforcement lives server-side in the API's RBAC guards.
- The live preview flow ("Generate Preview") calls the same real OpenSCAD render pipeline as downloads (via `POST /render`, purpose `PREVIEW`), not an in-browser WASM compile — see the plan's "即時預覽設計取捨" section for why.

## Docker

Run from the **monorepo root** (the build context must include `packages/shared`, not just `apps/web`):

```bash
docker build -f apps/web/Dockerfile -t katacraft-web .
```

Serves the static build via nginx on port 80, with SPA fallback routing configured in `apps/web/nginx.conf`.
