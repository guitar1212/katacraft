# PRD — 3D 客製化模型 SaaS 平台

版本：v0.1 draft ｜ 狀態：規劃中

---

## 1. 產品概述

一個讓使用者上傳圖片／文字／選擇範本，即時調整參數並在瀏覽器中預覽 3D 模型，最終下載或直接匯入本地 3D 軟體／切片軟體的 SaaS 平台。內建點數制（暫不開放付費，新註冊使用者預設贈送 **50 點**），並提供完整後台管理系統供營運方上架、編輯、下架模型（含 OpenSCAD 原始碼管理）與管理使用者。

---

## 2. 角色

| 角色 | 說明 |
|---|---|
| Guest | 未登入，可瀏覽模型庫，無法客製化／下載 |
| Member | 已註冊使用者，擁有點數餘額，可客製化、下載、收藏 |
| Designer / Editor | 後台可上傳、編輯、上架/下架模型與 OpenSCAD 原始碼 |
| Admin | 後台全權限：使用者管理、點數調整、系統設定、審計紀錄 |

---

## 3. 功能需求（前台 / Member）

### 3.1 帳號與點數
- Email＋密碼註冊／登入、Email 驗證、忘改密碼
- OAuth：Google 登入
- 註冊即發放 **50 點**（`credits_ledger` 交易紀錄，type=`signup_bonus`）
- 點數規則：產生 3D 預覽不扣點；**下載或匯入本地軟體才扣點**（依模型設定，預設 1 點）
- 點數異動紀錄查詢（帳本模式，append-only ledger，非直接改欄位）
- 付款／訂閱：**本期不實作**，僅保留資料表與介面欄位（`plans`, `subscriptions`, `payment_provider` 皆先建表不啟用），UI 顯示「即將推出」

### 3.2 首頁 / 模型瀏覽
- 分類卡片導覽（可由後台自訂分類與排序）
- 模型庫（Models：可客製化）／成品庫（Printables：不可調整、直接下載）雙目錄
- 搜尋、篩選（分類、點數、熱門度）、收藏（Favorites）
- 模型卡片：縮圖、名稱、所需點數、下載次數、精選標記

### 3.3 客製化編輯器
- 依模型的 OpenSCAD 參數 schema 動態產生表單：數值滑桿／輸入框、下拉選單、文字輸入、字型選擇、色彩選擇器、檔案上傳、分組摺疊面板
- 圖片上傳 → 點陣圖轉向量（imagetracer / potrace）→ 擠出 3D
- 內建圖庫（icon bank）可直接套用範本圖案
- 手動「連接線條」畫筆工具（修復描圖後斷開的線段，確保單一連通零件）
- 即時 3D 預覽（Three.js／WebGL）：拖曳旋轉、縮放、鏡頭視角預設（Isometric／Front／Top／Side）
- 薄壁偵測：Web Worker 計算，低於噴頭直徑安全值即時標紅
- 「Generate Preview」（前端即時重算，不扣點）／「Download」（觸發正式算圖，扣點）

### 3.4 下載與本地端匯入（新增功能）
- **下載模式**：選擇輸出格式 STL／3MF（multipart）／OBJ／STEP，伺服端排隊算圖後提供下載連結
- **直接匯入本地軟體模式**：
  1. 前端偵測使用者裝置是否安裝「Desktop Companion」小工具（見 5.6）
  2. 若已安裝：呼叫 `http://127.0.0.1:{port}/detect` 取得本機已安裝之 3D 軟體／切片軟體清單（Blender、Fusion 360、SolidWorks、Bambu Studio、PrusaSlicer、Cura、OrcaSlicer 等）
  3. 使用者選擇目標軟體 → 呼叫對應軟體的自訂 URI Scheme（如 `bambustudio://open?url=...`、`prusaslicer://open?file=...`）或透過 Companion 落地存檔＋喚起應用程式
  4. 若未安裝 Companion：導引下載頁面（Windows / macOS 安裝檔），或退回一般下載模式
- 下載紀錄（My Downloads）：歷史清單、可重新下載（依保存期限）

### 3.5 其他
- 多語系（zh-TW / en，可擴充）
- 通知：Email（下載完成、點數即將用罄）；預留 Webhook／Telegram 整合欄位
- 使用者個人設定（語言、顯示名稱、密碼變更）

---

## 4. 功能需求（後台管理 Admin）

### 4.1 模型 / 設計管理
- 模型 CRUD：名稱、描述、分類、標籤、縮圖／預覽圖上傳、所需點數、上架狀態（草稿／上架／下架）
- **OpenSCAD 原始碼管理**：
  - 線上程式碼編輯器（語法高亮）上傳／編輯 `.scad` 檔案
  - 參數 schema 視覺化設計器：定義每個 OpenSCAD 變數對應的 UI 欄位型別（滑桿/下拉/顏色/文字/檔案）、分組、預設值、最小最大值、單位
  - 版本控制（每次儲存建立新版本，可回溯／比對差異）
  - 「測試預覽」：後台內直接呼叫渲染引擎驗證修改結果，不影響正式版本
  - 一鍵上架／下架（軟刪除，下架模型不出現在前台但保留歷史下載紀錄關聯）
- Printables（成品包）管理：檔案上傳、多檔案組合管理
- 分類／標籤管理

### 4.2 使用者管理
- 使用者列表：搜尋、篩選（角色、註冊時間、點數餘額、狀態）
- 點數手動調整（含原因備註，寫入 ledger）
- 停權／解除停權、角色指派（Member／Designer／Admin）
- 使用者詳細頁：下載紀錄、點數異動紀錄、登入紀錄

### 4.3 系統管理
- 點數規則設定（註冊贈點數、各模型扣點數）
- 公告／橫幅管理
- 審計紀錄（Audit Log）：所有後台異動皆記錄操作者、時間、diff
- 資料庫管理工具：唯讀查詢介面（供客服／營運排查問題，具權限管控與 SQL 白名單／唯讀連線）
- 系統監控儀表板：算圖佇列狀態、失敗率、平均算圖時間、儲存空間用量

### 4.4 權限（RBAC）
| 功能 | Member | Designer | Admin |
|---|---|---|---|
| 瀏覽/客製化/下載 | ✅ | ✅ | ✅ |
| 模型上傳/編輯 | ❌ | ✅ | ✅ |
| 上架/下架 | ❌ | ✅ | ✅ |
| 使用者管理 | ❌ | ❌ | ✅ |
| 點數調整 | ❌ | ❌ | ✅ |
| 系統設定 | ❌ | ❌ | ✅ |

---

## 5. 技術架構

### 5.1 前端
- Framework：React 18 + Vite + TypeScript
- 3D：Three.js（含 `ExtrudeGeometry`、自訂 orbit controls；粗線預覽可用 `Line2`/`LineMaterial`）
- 狀態管理：Zustand 或 Redux Toolkit
- UI：Tailwind CSS + 元件庫（Radix UI）
- 表單引擎：依後台定義的 JSON Schema 動態渲染參數面板
- i18n：i18next

### 5.2 後台管理前端
- 獨立 SPA（`/admin` 路由或子網域），與前台共用元件庫
- 程式碼編輯器：Monaco Editor（OpenSCAD 語法高亮）
- 需另做 OpenSCAD → 表單 schema 的 parser／視覺化設計器

### 5.3 後端 API
- Runtime：Node.js（NestJS）或 Python（FastAPI），REST（未來可加 GraphQL）
- Auth：JWT + Refresh Token；OAuth2（Google）
- API 模組：`auth`、`users`（含點數 ledger）、`models`、`categories`、`favorites`、`render`（算圖佇列）、`downloads`、`companion`（本地偵測橋接）、`admin/*`

### 5.4 3D 產生引擎
- 原始模型格式：OpenSCAD（`.scad`）
- 即時預覽：`openscad-wasm`（瀏覽器內編譯）或前端幾何近似引擎（依效能評估擇一）
- 正式算圖：伺服端 Worker Pool 執行 **OpenSCAD CLI**（Docker 容器化，水平擴充）
- 薄壁檢測：共用邏輯，前端 Web Worker（即時）＋ 後端算圖時二次驗證
- 佇列：BullMQ + Redis（`render:queue`），Job 狀態：`queued → processing → done/failed`
- 格式轉換／匯出：STL（自製 binary writer 或 `lib3mf`）、3MF（multipart，多色分層）、OBJ、STEP（如需 CAD 精度，經 OpenCASCADE / FreeCAD 轉檔服務）

### 5.5 圖片處理
- 點陣圖轉向量：`imagetracerjs` 或 `potrace`（Node 端）
- 連通元件分析／距離轉換（薄壁判斷）：自製演算法（flood fill + BFS distance transform）

### 5.6 Desktop Companion（本地端偵測與匯入）
- 技術選型：Tauri（優先，體積小）或 Electron，背景常駐小工具
- 功能：
  - 本機啟動 `127.0.0.1:{port}` HTTP 服務（CORS 限定平台網域）
  - 偵測已安裝軟體：掃描已知安裝路徑／Windows 登錄檔／macOS `/Applications`／已註冊的自訂 URI Scheme
  - 接收平台傳來的模型檔（下載或直接串流），寫入暫存目錄，透過對應軟體的 URI Scheme 或 CLI 參數喚起開啟
  - 自動更新機制
- 安全性：Companion 僅接受平台簽署過的請求（token 驗證），避免任意網站濫用本機喚起功能

### 5.7 資料庫
- 主資料庫：PostgreSQL
  - `users`, `credits_ledger`, `roles`
  - `models`, `model_versions`, `model_param_schema`, `categories`, `tags`
  - `printables`, `printable_files`
  - `favorites`, `downloads`, `render_jobs`
  - `plans`, `subscriptions`（先建表不啟用）
  - `audit_logs`
- 快取／佇列：Redis
- 檔案儲存：S3 相容物件儲存（模型縮圖、原始 scad、算圖結果、companion 安裝檔）
- 搜尋（可選 Phase 2）：Postgres full-text search 或 Meilisearch

### 5.8 基礎設施
- 容器化：Docker；正式環境 Kubernetes（或先 Docker Compose + 單雲主機起步）
- CI/CD：GitHub Actions
- 監控／錯誤追蹤：Sentry；行為分析：PostHog
- 物件儲存 CDN：CloudFront／Cloudflare

---

## 6. 核心資料表（草案）

```
users(id, email, password_hash, name, role, credits_balance, language, status, created_at)
credits_ledger(id, user_id, delta, reason, ref_type, ref_id, created_at)
models(id, slug, name, description, category_id, thumbnail_url, credit_cost, status[draft/published/unpublished], created_by, created_at)
model_versions(id, model_id, scad_source_url, param_schema_json, version_no, created_by, created_at)
categories(id, name, sort_order)
favorites(user_id, model_id, created_at)
render_jobs(id, user_id, model_id, params_json, format, status, output_url, error, created_at, finished_at)
downloads(id, user_id, model_id, render_job_id, credits_spent, method[download/companion_import], created_at)
audit_logs(id, actor_id, action, target_type, target_id, diff_json, created_at)
plans(id, name, price, credits_per_month)          -- 建表保留，未啟用
subscriptions(id, user_id, plan_id, status)          -- 建表保留，未啟用
```

---

## 7. 里程碑

| 階段 | 範圍 |
|---|---|
| M1 MVP | 帳號/點數、模型瀏覽、客製化編輯器（含即時預覽/薄壁檢測）、一般下載、基礎後台（模型 CRUD + 使用者管理） |
| M2 | Desktop Companion（本地偵測與匯入）、OpenSCAD 版本控制、審計紀錄、佇列監控儀表板 |
| M3 | 付款/訂閱正式啟用、多語系擴充、搜尋優化 |
