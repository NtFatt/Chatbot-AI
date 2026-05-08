# Chatbot AI — Project Progress Checklist

**Last updated:** 2026-04-30
**Repository:** `d:\LEARNCODE\Chatbot AI`
**Release status:** RELEASE CANDIDATE

---

## 1. Snapshot

| Field | Value |
|-------|-------|
| **Project name** | Chatbot AI — Vietnamese Study Assistant |
| **Overall status** | `RELEASE CANDIDATE` — Phases 0–7C implemented and validated; all 6 E2E specs pass; lint/typecheck/build/unit-tests all green |
| **Current active task** | Browser smoke test (manual, ~20 minutes) |
| **Next recommended task** | Run the manual browser smoke checklist in Section 7, then release |
| **Risks / blockers** | Gemini free-tier quota is exhausted (429 RESOURCE_EXHAUSTED); OpenAI has no credentials — production chat requires either quota recovery or credentials. All E2E mocks handle this gracefully. |

---

## 2. Progress Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | NOT STARTED |
| `[~]` | IN PROGRESS |
| `[x]` | DONE |
| `[!]` | BLOCKED |

---

## 3. Phase Overview

| Phase | Title | Status | Notes |
|-------|-------|--------|-------|
| 0 | Production Hardening Baseline | `[x] DONE` | CI, env validation, graceful shutdown, structured error handling, test baseline |
| 1 | Artifact Refinement + Study Review | `[x] DONE` | Quiz review mode, flashcard flip, copy/expand flows, drawer study affordances |
| 2 | Session Workspace Maturity | `[x] DONE` | Continue-learning, session search, pinned grouping, context-menu session actions |
| 3A | Global Message Search | `[x] DONE` | Cross-session message search endpoint + sidebar results |
| 3B | Cross-Session Artifact Search | `[x] DONE` | Artifact search, favorites, toggle flow, sidebar integration |
| 4 | AI Quality + Structured Output | `[x] DONE` | Structured output, session intelligence, confidence/quality signals, artifact fallback honesty |
| 5 | Session UX Improvements | `[x] DONE` | Overflow menu, artifact/pin badges, title-first rows, improved auto-title timing |
| 6A | My Artifacts Workspace | `[x] DONE` | Artifact drawer with Current Session, Favorites, All Artifacts modes and session provenance |
| 6B | Export / Share Artifacts | `[x] DONE` | Markdown export, token-based public sharing, revoke flow, read-only public page |
| 6C | Stabilization / Performance Cleanup | `[x] DONE` | Vite manual chunks, lazy-loaded routes, ArtifactPreview decomposition, E2E coverage |
| 7A | Analytics + Learning Insights | `[x] DONE` | Insights drawer, learning aggregation, provider pulse summary, focused E2E stabilization |
| 7B | Batch Session Actions UI | `[x] DONE` | Sidebar selection mode, batch archive/delete, safe destructive flow, focused E2E coverage |
| 7C | Onboarding + Activation | `[x] DONE` | First-run guidance, visible starter prompts, lightweight activation cues, feature signposting |

---

## 4. Phase Notes

- [x] **Phase 0 — Production Hardening Baseline**
  Done: `gracefulShutdown()` handler, `JWT_SECRET` placeholder check, `ChatGuardService` rate limiting, `ErrorBoundary` with reload, `afterEach(cleanup)`, GitHub Actions CI pipeline with lint/typecheck/test/build gates.
  Files: `apps/api/src/server.ts`, `apps/api/src/config/env.ts`, `.github/workflows/ci.yml`, all test files with cleanup.
  Validated: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

- [x] **Phase 1 — Artifact Refinement + Study Review**
  Done: quiz review mode (one-question-at-a-time, answer reveal, explanations, score summary, retake), flashcard flip UX, note/summary copy and expand flows, artifact drawer study affordances.
  Files: `apps/web/src/components/chat/ArtifactPreview.tsx`, `ArtifactPreviewContent.tsx`, `QuizReviewMode.tsx`, `ArtifactDrawer.tsx`, `apps/api/src/modules/artifacts/artifacts.service.ts`, `apps/api/test/artifacts.routes.test.ts`.
  Validated: artifact component tests, `pnpm test`, `pnpm build`.

- [x] **Phase 2 — Session Workspace Maturity**
  Done: `GET /api/chat/sessions/continue-learning` (inactive >24h), server-side session search (`ILIKE` on title + message content + contextSummary), dedicated "Đã ghim" pinned section, right-click context menu (rename/pin/archive/delete), `Cmd/Ctrl+K` search shortcut, auto-title timing fix via `maybeRetitleSession` before streaming starts, `buildSessionTitle` strips code fences and question prefixes.
  Files: `apps/api/src/modules/chat/chat.repository.ts`, `chat.routes.ts`, `chat.service.ts`, `apps/web/src/components/layout/SessionSidebar.tsx`, `apps/web/src/hooks/use-continue-learning.ts`, `apps/web/src/utils/format.ts`, `apps/api/src/utils/text.ts`.
  Validated: 104/104 web tests, 91/91 API tests, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

- [x] **Phase 3A — Global Message Search**
  Done: `GET /api/chat/sessions/global-search` endpoint using `$queryRaw` with `DISTINCT ON` for deduplication, `GlobalSearchResult` shared type, `useGlobalSearch` hook with 300ms debounce, sidebar wired to server-driven results with session navigation.
  Files: `apps/api/src/modules/chat/chat.repository.ts`, `chat.routes.ts`, `chat.controller.ts`, `packages/shared/src/schemas/chat.ts`, `apps/web/src/hooks/use-global-search.ts`, `apps/web/src/utils/query-keys.ts`, `apps/web/src/components/layout/SessionSidebar.tsx`.
  Validated: `apps/api/test/chat.routes.test.ts`, web sidebar/search tests, full `pnpm test`.

- [x] **Phase 3B — Cross-Session Artifact Search**
  Done: artifact search endpoint (`GET /api/artifacts/search`), favorites (`GET /api/artifacts/favorites`, `PATCH /api/artifacts/:id/favorite`), cross-session artifact cards with session provenance, `isFavorited` flag surfaced in all artifact list responses.
  Files: `apps/api/src/modules/artifacts/artifacts.repository.ts`, `artifacts.service.ts`, `artifacts.controller.ts`, `artifacts.routes.ts`, `packages/shared/src/schemas/artifacts.ts`, `apps/web/src/hooks/use-artifact-search.ts`, `apps/web/src/services/artifacts-service.ts`, `apps/web/src/components/chat/ArtifactPreview.tsx`, `apps/web/src/components/layout/ArtifactDrawer.tsx`.
  Validated: `apps/api/test/artifacts.routes.test.ts`, artifact drawer/preview tests, full `pnpm test`.

- [x] **Phase 4 — AI Quality + Structured Output**
  Done: `StructuredOutputService` with provider-aware Zod schema validation and explicit legacy rescue fallback, `SessionIntelligenceService` for turn intelligence + long-session summary generation, per-message `confidenceScore` / `subjectLabel` / `topicLabel` / `levelLabel`, per-artifact `qualityScore`, `ThreadWelcome` topic chips, compact `ScoreBadge` for quality/confidence in message/artifact UI, degraded-source artifact fallback with honest labeling.
  Files: `apps/api/src/integrations/ai/structured-output.service.ts`, `apps/api/src/modules/chat/session-intelligence.service.ts`, `apps/api/src/modules/artifacts/artifacts.service.ts`, `apps/api/src/integrations/ai/adapters/openai.adapter.ts`, `apps/api/src/integrations/ai/adapters/gemini.adapter.ts`, `packages/shared/src/schemas/artifacts.ts`, `packages/shared/src/prompts/sessionIntelligence.ts`, `packages/shared/src/types/artifacts.ts`, `apps/web/src/components/chat/ChatMessageBubble.tsx`, `apps/web/src/components/chat/ThreadWelcome.tsx`, `apps/web/src/components/ui/ScoreBadge.tsx`.
  Validated: `apps/api/test/structured-output.service.test.ts`, `apps/api/test/session-intelligence.service.test.ts`, `apps/api/test/artifacts.service.test.ts`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

- [x] **Phase 5 — Session UX Improvements**
  Done: consolidated `...` overflow menu replacing inline icon cluster (Pin/Archive/Delete), artifact count + "Tiếp tục" badges moved out of row to reduce height, session title dominant with `min-w-0 flex-1 truncate`, `maybeRetitleSession` fires before AI streaming starts, `buildSessionTitle` strips code fences and common question/task prefixes and trims whitespace.
  Files: `apps/web/src/components/layout/SessionSidebar.tsx`, `apps/api/src/modules/chat/chat.service.ts`, `apps/api/src/utils/text.ts`, `apps/web/test/session-sidebar.test.tsx`, `apps/api/test/chat.routes.test.ts`, `apps/api/test/text.test.ts`.
  Validated: 104/104 web tests pass, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

- [x] **Phase 6A — My Artifacts Workspace**
  Done: artifact drawer with `Current Session` / `Favorites` / `All Artifacts` browse modes, `sessionTitle` populated on all artifact list responses, artifact cards show session provenance in cross-session modes, type filter chips with counts, favorite toggle inline on artifact cards.
  Files: `apps/api/src/modules/artifacts/artifacts.repository.ts`, `artifacts.service.ts`, `packages/shared/src/types/artifacts.ts`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/src/components/layout/ArtifactDrawer.tsx`, `apps/web/src/components/chat/ArtifactPreview.tsx`, `apps/web/src/hooks/use-artifact-search.ts`, `apps/web/src/services/artifacts-service.ts`, `apps/api/test/artifacts.routes.test.ts`, `apps/api/test/artifacts.service.test.ts`, `apps/web/test/artifact-drawer.test.tsx`, `apps/web/test/artifact-preview.test.tsx`.
  Validated: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

- [x] **Phase 6B — Export / Share Artifacts**
  Done: `GET /api/artifacts/:id/export` returns markdown with frontmatter, `POST /api/artifacts/:id/share` generates a `randomBytes(24)` base64url share token (idempotent — reuses existing token), `DELETE /api/artifacts/:id/share` clears token, `GET /api/public/artifacts/:shareToken` serves read-only artifact at `/shared/artifacts/:shareToken`, `ArtifactPreview` wired with Export/Share/Revoke buttons, `artifacts-service.ts` has `buildArtifactShareUrl()` helper, `PublicArtifactPage.tsx` renders read-only artifact.
  Files: `apps/api/src/modules/artifacts/artifact-markdown.ts`, `artifacts.service.ts`, `artifacts.routes.ts`, `artifacts.controller.ts`, `artifacts.repository.ts`, `apps/api/src/app.ts` (public routes), `packages/shared/src/types/artifacts.ts`, `packages/shared/src/schemas/artifacts.ts`, `apps/web/src/services/artifacts-service.ts`, `apps/web/src/components/chat/ArtifactPreview.tsx`, `apps/web/src/components/layout/ArtifactDrawer.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/src/features/public/PublicArtifactPage.tsx`, `apps/web/src/app/router.tsx`, `apps/api/test/artifacts.routes.test.ts`, `apps/api/test/artifacts.service.test.ts`, `apps/web/test/artifact-preview.test.tsx`, `apps/web/test/public-artifact-page.test.tsx`.
  Validated: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

- [x] **Phase 6C — Stabilization / Performance Cleanup**
  Done: Vite `manualChunks` splits react-core/router/state-query/markdown/ui-vendor/forms/socket/vendor, `DashboardPage`/`LoginPage`/`PublicArtifactPage`/`ArtifactDrawer` are lazy-loaded via `React.lazy()`, `ArtifactPreview` decomposed into shell + `ArtifactPreviewContent` + `QuizReviewMode`, `ArtifactDrawer` receives `onExport`/`onShare`/`onRevokeShare`/`onToggleFavorite` props for end-to-end flow.
  Files: `apps/web/vite.config.ts`, `apps/web/src/app/router.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/src/components/chat/ArtifactPreview.tsx`, `ArtifactPreviewContent.tsx`, `QuizReviewMode.tsx`, `tests/e2e/artifact-workspace.spec.ts`.
  Validated: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, focused artifact E2E.

- [x] **Phase 7A — Analytics + Learning Insights**
  Done: added `GET /api/insights/learning` for session/artifact/topic aggregation, shipped a compact `LearningInsightsDrawer` in the dashboard toolbar, reused continue-learning + provider metrics/incidents for "worth revisiting" and runtime pulse sections, and stabilized the focused E2E selectors for KPI/provider-pulse assertions.
  Files: `packages/shared/src/types/insights.ts`, `apps/api/src/modules/insights/insights.service.ts`, `insights.controller.ts`, `insights.routes.ts`, `apps/api/src/app.ts`, `apps/web/src/services/insights-service.ts`, `apps/web/src/components/layout/LearningInsightsDrawer.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/src/utils/query-keys.ts`, `apps/api/test/insights.routes.test.ts`, `apps/api/test/insights.service.test.ts`, `apps/web/test/learning-insights-drawer.test.tsx`, `tests/e2e/learning-insights.spec.ts`.
  Validated: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, focused E2E.

- [x] **Phase 7B — Batch Session Actions UI**
  Done: added an explicit sidebar selection mode, multi-select by session row, batch archive for active sessions, batch delete for active/archived sessions, destructive confirmation, disabled/loading states, and safe coexistence with grouping/search/overflow flows.
  Files: `apps/web/src/components/layout/SessionSidebar.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/test/session-sidebar.test.tsx`, `apps/api/test/chat.routes.test.ts`, `tests/e2e/session-batch-actions.spec.ts`.
  Validated: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, focused E2E.

- [x] **Phase 7C — Onboarding + Activation**
  Done: upgraded `ThreadWelcome` into a clearer first-run activation surface, made high-value starter prompts visible for eligible new users, added a dismissible `WorkspaceActivationGuide` with first-session / first-question / first-artifact progress cues, and signposted `Study Artifacts`, `Search`, and `Learning Insights` without changing the core chat flow.
  Files: `apps/web/src/components/chat/ThreadWelcome.tsx`, `apps/web/src/components/chat/WorkspaceActivationGuide.tsx`, `apps/web/src/hooks/use-workspace-activation.ts`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/src/components/layout/SessionSidebar.tsx`, `apps/web/test/thread-welcome.test.tsx`, `apps/web/test/workspace-activation-guide.test.tsx`, `apps/web/test/session-sidebar.test.tsx`.
  Validated: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

---

## 5. Validation Snapshot

| Command | Result |
|---------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` (shared) | PASS |
| `pnpm typecheck` (api) | PASS |
| `pnpm typecheck` (web) | PASS |
| `pnpm test:api` (17 test files) | PASS — 108 tests |
| `pnpm test:web` (14 test files) | PASS — 125 tests |
| `pnpm test` | PASS — 233 tests across 31 test files (API + web) |
| `pnpm test:e2e -- tests/e2e/artifact-workspace.spec.ts` | PASS |
| `pnpm test:e2e -- tests/e2e/session-batch-actions.spec.ts` | PASS |
| `pnpm test:e2e -- tests/e2e/learning-insights.spec.ts` | PASS |
| `pnpm test:e2e -- tests/e2e/study-workspace.spec.ts` | PASS — 3/3 specs (fixed missing testids + mocked `/api/chat/ask`) |
| `pnpm test:e2e` (full suite) | PASS — 6/6 specs |
| `pnpm build:shared` | PASS |
| `pnpm build:api` (tsup, ESM) | PASS |
| `pnpm build:web` (vite, chunked) | PASS |
| `pnpm exec prisma validate --schema prisma/schema.prisma` | PASS |
| `pnpm exec prisma generate --schema prisma/schema.prisma` | FAIL — transient Windows file-lock on DLL; schema is valid |

---

## 6. Deferred Scope

The following items are intentionally **not shipped** in this release. Each has a reason and a recommended future milestone.

| Status | Item | Reason deferred | When to revisit |
|--------|------|----------------|-----------------|
| `[ ]` | **AI quality mode settings control** — no UI toggle for quality vs speed tradeoff | Low product validation signal; feature not validated with real users | After user research |
| `[~]` | **Real-time messaging (deep)** — WebSocket state synchronization, reconnect logic, optimistic UI order guarantees | Realtime transport and recovery exist; deeper state-machine polish still deferred | Future phase |
| `[ ]` | **Advanced batch session actions** — multi-select archive/delete shipped; batch pin/rename/favorite/export and keyboard power features are still intentionally deferred | Current release only needs safe archive/delete workflow; broader bulk editing would increase sidebar complexity | Future phase |
| `[~]` | **Advanced analytics / dashboards** — lightweight learning insights shipped in `LearningInsightsDrawer`; deeper historical analytics, charts, and product telemetry are still deferred | Product now has a useful end-user insights layer; anything broader risks BI/system creep | Future phase |
| `[ ]` | **Advanced onboarding / study plans** — lightweight first-run activation is shipped, but guided study plans, habits, and long-horizon coaching remain deferred | Current release only needs a calm first-run activation layer; anything broader would become a separate product system | Future phase |
| `[ ]` | **Permission / multi-user** — Single-user MVP; no shared sessions or roles | Auth infrastructure exists; multi-user scope is a separate product decision | Future phase |
| `[ ]` | **Refactor long files** — Several service/UI files remain large | Functional correctness took priority over style refactors | Before / during later phases |

---

## 7. Next Recommended Tasks

1. **Browser smoke test** (manual, ~20 minutes)
   - Start API: `pnpm dev:api`
   - Start Web: `pnpm dev:web`
   - Open `http://localhost:5173`
   - Log in
   - Confirm first-run onboarding/welcome guidance appears for a new user
   - Click one starter prompt — confirm the composer is prefilled
   - Dismiss the activation guide — confirm the main flow stays usable and calm
   - Create a new session
   - Send a first message — confirm sidebar title updates before AI finishes
   - Generate an artifact — confirm quality badge appears
   - Open **Study Artifacts** — confirm **Current Session**, **Favorites**, and **All Artifacts** all load correctly
   - Favorite/unfavorite an artifact — confirm it moves in/out of **Favorites**
   - Confirm cross-session artifact cards show the correct source session title
   - Export one artifact from each available type — confirm markdown download opens cleanly
   - Create a share link — confirm link is copied and `/shared/artifacts/:token` opens the read-only page (incognito)
   - Revoke the share link — confirm the old public URL returns 404
   - Test the `...` menu: pin, rename, archive, delete
   - Open session search (Cmd+K) — search by session title
   - Open artifact search — search by artifact content/title
   - Open **Learning Insights** — confirm session/artifact counts, top topics, revisit list, and provider pulse render cleanly
   - Enter **Select** mode in the sidebar — select one session, then multiple sessions
   - Batch archive selected active sessions — confirm rows disappear from active groups and archived counts update
   - Switch to archived view — batch delete one archived session and confirm the destructive prompt appears first
   - Exit selection mode — confirm normal row-open and `...` overflow interactions still behave correctly
   - Check browser console for errors

If the smoke checklist passes → **READY FOR RELEASE**.

---

## 8. Release Criteria Checklist

- [x] All phases 0–5 implemented and tested
- [x] Phase 6A (`My Artifacts` workspace) implemented and validated
- [x] Phase 6B (`Export / Share Artifacts`) implemented and validated
- [x] Phase 6C (`Stabilization / Performance Cleanup`) implemented and validated
- [x] Phase 7A (`Analytics + Learning Insights`) implemented and validated
- [x] Phase 7B (`Batch Session Actions UI`) implemented and validated
- [x] Phase 7C (`Onboarding + Activation`) implemented and validated
- [x] `pnpm lint` — PASS
- [x] `pnpm typecheck` — PASS (shared + api + web)
- [x] `pnpm build` — PASS (shared + api + web)
- [x] `pnpm test` — PASS (233 tests across 31 test files)
- [x] Artifact workspace E2E — PASS (`tests/e2e/artifact-workspace.spec.ts`)
- [x] Batch session actions E2E — PASS (`tests/e2e/session-batch-actions.spec.ts`)
- [x] Learning insights E2E — PASS (`tests/e2e/learning-insights.spec.ts`)
- [x] Study workspace E2E — PASS (`tests/e2e/study-workspace.spec.ts`) — 3/3 specs; testids added + `/api/chat/ask` mocked
- [x] All API endpoints respond 200/201/400 correctly in automated route/service tests
- [x] No TypeScript errors in any package
- [x] Prisma schema validates (generate has transient Windows file-lock, not a schema issue)
- [x] Vite manual chunking active (react-core, router, state-query, markdown, ui-vendor, forms, socket, vendor)
- [x] Checklist reflects final state accurately
- [!] **Browser smoke test** — manual, pending (requires running dev servers)
