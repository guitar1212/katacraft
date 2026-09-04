# KataCraft

3D 客製化模型 SaaS 平台（M1 MVP 骨架）。完整規劃見 [`PRD.md`](./PRD.md)；本次實作範圍與延後項目見 [`.claude`](#) 對話紀錄或下方摘要，API 合約見 [`API_CONTRACT.md`](./API_CONTRACT.md)。

## Monorepo 結構

```
apps/
  api/        NestJS 後端（auth、models、render、downloads、admin/*）
  web/        React + Vite 前端（會員前台 + /admin 後台）
packages/
  shared/     前後端共用的 TypeScript types 與 zod schema（含 OpenSCAD 參數驗證）
```

## 必要條件

- Node.js 20+（開發時用的是 v24）
- **其中一種**：
  - **本機沒有 Docker？** 用 [GitHub Codespaces](#github-codespaces最簡單不用裝-docker) — 免費額度、瀏覽器裡就有現成的 Docker，這個 repo 已經幫你把 `.devcontainer` 設好了。
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) — `docker compose up` 會啟動 Postgres、Redis，並在容器內建置好含 OpenSCAD CLI 的 API image，不需要在本機另外安裝 OpenSCAD。
  - 或者：本機自行安裝 [PostgreSQL 16](https://www.postgresql.org/download/)、[Redis](https://redis.io/download)、[OpenSCAD](https://openscad.org/downloads.html)，並在 `.env` 設定對應連線字串／`OPENSCAD_BIN` 路徑。

> 這次開發機器上沒有安裝 Docker / OpenSCAD / Postgres / Redis，所以**沒有跑過真正需要資料庫的流程**（註冊 → 瀏覽 → 客製化 → 產生預覽 → 下載扣點）。已完成並驗證：前後端 `npm install`／TypeScript 型別檢查／production build 全部通過；API 實際啟動過（`node dist/main.js`），全部路由正確掛載，`GET /health` 回應正常，`GET /categories` 在無資料庫時如預期回傳 500（證明一路打到 Prisma 層，只是缺資料庫），`GET /auth/google/status` 正確回報未啟用。請照下方步驟在有基礎設施的環境把資料庫接上後，跑一次完整流程驗證。

## GitHub Codespaces（最簡單，不用裝 Docker）

這個 repo 已經有 [`.devcontainer/devcontainer.json`](./.devcontainer/devcontainer.json)，開出來的雲端環境自帶 Docker（docker-in-docker feature），完全不用在自己電腦裝任何東西：

1. 把這個 repo push 到你自己的 GitHub（Codespaces 需要 repo 在 GitHub 上）。
2. GitHub 上該 repo 頁面 → **Code** → **Codespaces** → **Create codespace on main**。
3. 容器建立時會自動跑 [`.devcontainer/post-create.sh`](./.devcontainer/post-create.sh)：建好 `.env`、抓 Codespaces 自動配的網址寫進 `apps/web/.env` 的 `VITE_API_BASE_URL`、`npm install`、建置 `packages/shared`、`prisma generate`。容器一啟動也會自動 `docker compose up -d`（Postgres + Redis + 含 OpenSCAD 的 API）。
4. 打開內建終端機執行：
   ```bash
   npm run prisma:migrate -w apps/api
   npm run seed -w apps/api
   npm run dev -w apps/web
   ```
5. VS Code 右下角/「PORTS」分頁會跳出 5173（前端）的轉發網址，點開即可；3000（API）也會一起轉發。

**注意**：`devcontainer.json` 把 3000、5173 設成 **public**（公開）可見性，這樣瀏覽器打 API 才不會卡在 GitHub 登入導向。也就是說只要 Codespace 還開著，知道網址的人都能連進去——對灌了種子假資料的 demo 環境沒差，但不要放真實資料。免費額度：個人帳號（非組織/企業帳號）每月 120 core-hours，2-core 機器大約等於 60 小時實際使用時間，另外還有 15GB 儲存空間，額度內都不用付費，超過需要綁信用卡按用量計費——不想被扣款的話，去 GitHub 帳號設定把 Codespaces 的用量上限設成免費額度即可自動擋掉超額，用完記得把 Codespace 停止（Stop）或刪除，停止期間不計費。

## 第一次啟動

```bash
cp .env.example .env
cp .env.example apps/api/.env         # API 是用自己目錄下的 .env（dotenv 讀 cwd），根目錄那份主要給 docker compose 的變數替換用
npm install
npm run build -w packages/shared      # 前後端都靠這個共用型別套件，先建置一次
```

> 這個 repo 用的 Prisma 是 7.x（`prisma`／`@prisma/client` 都釘在 `^7.10.0`，別跟著 CLI 提示升級到 8 的 RC 版，指令介面整個換了）。Prisma 7 把 `datasource url` 從 `schema.prisma` 移除了，改成執行期用 driver adapter（`@prisma/adapter-pg`）注入連線字串，設定檔在 [`apps/api/prisma.config.ts`](./apps/api/prisma.config.ts)；`prisma generate` 產出的是可讀的 TypeScript 原始碼（`apps/api/src/generated/prisma`），會跟著 `nest build` 一起編譯，不是黑盒子 JS。

### 方式 A：Docker Compose（推薦）

```bash
docker compose up -d          # Postgres + Redis + API(含 OpenSCAD)
npm run prisma:migrate -w apps/api
npm run seed -w apps/api      # 建立管理員帳號 + 2 個客製化範例模型 + 1 個成品範例
npm run dev -w apps/web       # 前端另開一個終端機執行
```

API 預設在 `http://localhost:3000`，前端在 `http://localhost:5173`。

### 方式 B：本機安裝 Postgres/Redis/OpenSCAD

修改 `.env` 內的 `DATABASE_URL`、`REDIS_URL`、`OPENSCAD_BIN`（Windows 上通常是 `C:\Program Files\OpenSCAD\openscad.exe`），然後：

```bash
npm run prisma:migrate -w apps/api
npm run seed -w apps/api
npm run dev:api     # 終端機 1
npm run dev:web     # 終端機 2
```

### 種子帳號

Seed 腳本會建立 `admin@katacraft.local`（密碼預設 `Admin1234!`，可用 `SEED_ADMIN_PASSWORD` 環境變數覆蓋），角色為 Admin，可登入 `/admin` 後台。

## 本次範圍與明確延後的功能

見專案根目錄的計畫紀錄。摘要：已實作帳號/點數/JWT 登入（Google OAuth 需自行設定 Client ID/Secret 才會啟用）、模型瀏覽與收藏、依 JSON Schema 動態產生的客製化表單＋Three.js 預覽、真實呼叫 OpenSCAD CLI 的算圖流程（含 `$fn` 精度區分 preview/final、參數注入防護）、下載扣點（點數帳本 append-only）、後台模型/版本/分類/使用者/審計/系統設定管理。**未實作**：圖片轉向量、薄壁偵測、Desktop Companion 原生應用、STEP 匯出、金流啟用、DB 唯讀查詢工具與監控儀表板、Meilisearch、K8s 設定 —— 這些在 PRD 中屬於 M2/M3 範圍。

## 常用指令

| 指令 | 說明 |
|---|---|
| `npm run dev:api` | 啟動 API（含算圖 worker，同一個程序） |
| `npm run dev:web` | 啟動前端 Vite dev server |
| `npm run prisma:migrate -w apps/api` | 建立/套用資料庫 migration |
| `npm run seed -w apps/api` | 灌入種子資料 |
| `docker compose up -d` | 啟動 Postgres + Redis + API容器（含OpenSCAD） |
