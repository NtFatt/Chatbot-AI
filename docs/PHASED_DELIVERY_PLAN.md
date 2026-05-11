# Chatbot AI — Phased Delivery Plan

**Document version:** 1.3
**Last updated:** 2026-04-28
**Repository:** `d:\LEARNCODE\Chatbot AI`
**Status:** Phase 3B COMPLETED. Phase 4 in progress with structured output, session intelligence, and trust metadata implemented.

---

## Table of Contents

1. [Repository Understanding Summary](#1-repository-understanding-summary)
2. [Current Product Maturity](#2-current-product-maturity)
3. [Remaining Product Gaps](#3-remaining-product-gaps)
4. [Feature Family Evaluation](#4-feature-family-evaluation)
5. [Full Phased Roadmap](#5-full-phased-roadmap)
6. [Phase Tracking Board](#6-phase-tracking-board)
7. [Recommended Next Phase](#7-recommended-next-phase)

---

## 1. Repository Understanding Summary

### 1.1 Monorepo Structure

```
chatbot-ai-monorepo/
├── apps/
│   ├── api/          # Node.js + Express + TypeScript backend
│   └── web/          # React + Vite + TypeScript frontend
├── packages/
│   └── shared/       # Shared types, contracts, schemas, prompts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/   # 5 migrations (init → message index → AI pipeline → pin/archive → artifacts)
├── infra/            # docker-compose.yml
├── docs/             # REAL_AI_SETUP.md
├── scripts/          # dev.mjs, run-e2e.mjs, ai-doctor.mjs
├── tests/            # (monorepo-level test scripts)
├── package.json      # pnpm workspace root
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── prettierrc
├── eslint.config.js
├── playwright.config.ts
└── .cursor/rules/   # Project-specific rules
```

### 1.2 Backend Architecture

**Stack:** Node.js + Express + TypeScript, PostgreSQL + Prisma ORM, Socket.IO

**Module organization (`apps/api/src/modules/`):**

| Module | Responsibility |
|--------|---------------|
| `auth/` | Guest login, JWT access token, refresh token rotation, logout |
| `chat/` | Session CRUD, message persistence, chat pipeline orchestration |
| `materials/` | Keyword-based material search, ranked recommendation engine |
| `artifacts/` | Flashcard/quiz/summary/note generation, persistence, retrieval |
| `providers/` | Provider configuration (DB + env override), diagnostics, health state |
| `usage/` | Token usage logging, incident tracking, metrics aggregation |

**Key infrastructure (`apps/api/src/`):**

| Directory | Purpose |
|-----------|---------|
| `integrations/ai/` | AI adapters (Gemini, OpenAI), orchestrator with retry/fallback, provider health service, response sanitizer, local study fallback |
| `integrations/retrieval/` | RAG retrieval service that builds context from materials catalog |
| `sockets/` | Socket.IO event handlers for chat (send, retry, join, sync) |
| `middlewares/` | Auth (JWT verify), request context (requestId), error handler, validation |
| `utils/` | Text processing, API response helpers, async handler, error classes |
| `config/` | Env vars, Prisma client, logger |

**REST API endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Guest login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/chat/sessions` | List active sessions |
| GET | `/api/chat/sessions/archived` | List archived sessions |
| POST | `/api/chat/sessions` | Create session |
| PATCH | `/api/chat/sessions/:id` | Update session (title, provider, pin, archive) |
| DELETE | `/api/chat/sessions/:id` | Delete session |
| GET | `/api/chat/sessions/:id/messages` | Get messages |
| POST | `/api/chat/ask` | Send message (HTTP fallback) |
| GET | `/api/materials/search` | Search materials |
| GET | `/api/materials/recommend` | Get ranked recommendations |
| GET | `/api/artifacts` | List user artifacts |
| POST | `/api/artifacts/generate` | Generate artifact |
| GET | `/api/artifacts/session/:sessionId` | List artifacts by session |
| DELETE | `/api/artifacts/:id` | Delete artifact |
| GET | `/api/providers` | List providers |
| POST | `/api/providers/test` | Run provider diagnostics |
| GET | `/api/providers/metrics` | Usage metrics |
| GET | `/api/providers/incidents` | Recent incidents |
| GET | `/api/chat/usage` | Usage for session/user |
| GET | `/health` | Health check with AI mode status |

**Socket.IO events (client ↔ server):**

| Direction | Event | Purpose |
|-----------|-------|---------|
| C→S | `chat:join_session` | Join a session room |
| C→S | `chat:send_message` | Send message (ACK pattern) |
| C→S | `chat:retry_message` | Retry failed message |
| C→S | `chat:typing` | Typing indicator |
| C→S | `chat:sync_state` | Recovery sync after reconnect |
| S→C | `chat:message_accepted` | User message persisted |
| S→C | `chat:message_received` | Generic message received |
| S→C | `chat:ai_started` | AI started generating |
| S→C | `chat:ai_chunk` | Streaming text chunk |
| S→C | `chat:ai_done` | AI finished with full response |
| S→C | `chat:message_failed` | Message generation failed |
| S→C | `chat:session_updated` | Session metadata changed |
| S→C | `chat:error` | Global socket error |

### 1.3 Frontend Architecture

**Stack:** React 18 + Vite + TypeScript, TanStack Query (server state), Zustand (auth + UI state), Socket.IO client, Tailwind CSS, Framer Motion, Lucide icons, Sonner toasts, react-markdown + rehype-sanitize, Zod (validation)

**Key components:**

| Component | File | Purpose |
|-----------|------|---------|
| `DashboardPage` | `features/dashboard/DashboardPage.tsx` | Main workspace — all state orchestration, mutations, queries |
| `LoginPage` | `features/auth/LoginPage.tsx` | Guest login with form validation |
| `SessionSidebar` | `components/layout/SessionSidebar.tsx` | Session list, grouped by recency, with pin/archive/search/rename |
| `ChatMessageBubble` | `components/chat/ChatMessageBubble.tsx` | Message rendering, artifact generation buttons, sources, retry |
| `ArtifactPreview` | `components/chat/ArtifactPreview.tsx` | Flashcard flip cards, quiz MCQ, summary, note rendering |
| `ChatComposer` | `components/chat/ChatComposer.tsx` | Auto-resize textarea, character counter, submit |
| `MaterialsPanel` | `components/materials/MaterialsPanel.tsx` | Material cards with search, type badges, match scores |
| `ArtifactDrawer` | `components/layout/ArtifactDrawer.tsx` | Slide-in artifact browser with type filtering |
| `ContextDrawer` | `components/layout/ContextDrawer.tsx` | Learning context: prompts + recent sources + materials |
| `WorkspaceSettingsSheet` | `components/layout/WorkspaceSettingsSheet.tsx` | Session rename, provider switch, usage, diagnostics |
| `ProviderDiagnosticsPanel` | `components/layout/ProviderDiagnosticsPanel.tsx` | Per-provider health, latency, incident history |

**State management:**
- **Zustand `auth-store`:** Persisted to localStorage. Holds `user`, `accessToken`, `refreshToken`, `bootstrapped`.
- **Zustand `ui-store`:** Ephemeral. Holds `selectedSessionId`, `theme`, `sidebarOpen`, `sidebarArchivedOpen`.
- **TanStack Query:** All server data (sessions, messages, artifacts, materials, providers, usage). Optimistic updates via `setQueryData` in mutation `onSuccess` callbacks.

**Socket hook (`use-chat-socket.ts`):** Manages the full real-time lifecycle:
- Connection state tracking ('connected' | 'reconnecting' | 'disconnected')
- Recovery state tracking ('idle' | 'syncing' | 'error')
- Optimistic message insertion before server ACK
- Chunk streaming by appending to message content
- Session recovery on reconnect (join + sync_state)
- HTTP fallback when socket is disconnected

### 1.4 Prisma / Data Model Summary

**Entities and their relationships:**

```
User (1) ──→ (many) AuthSession
User (1) ──→ (many) ChatSession
ChatSession (1) ──→ (many) Message
ChatSession (1) ──→ (many) RecommendationHistory
ChatSession (1) ──→ (many) AiUsageLog
ChatSession (1) ──→ (many) StudyArtifact
Message (1) ──→ (many) AiUsageLog
Message (1) ──→ (many) StudyArtifact
Subject (1) ──→ (many) Topic
Subject (1) ──→ (many) StudyMaterial
Topic (1) ──→ (many) StudyMaterial
StudyMaterial (1) ──→ (many) RecommendationHistory
User (1) ──→ (many) StudyArtifact
```

**Key indexes:**
- `chat_sessions(user_id, is_pinned DESC, updated_at DESC)` — for pinned-first session listing
- `chat_sessions(user_id, is_archived, updated_at DESC)` — for archived listing
- `messages(session_id, created_at)` — for chronological message retrieval
- `messages(client_message_id)` — unique — for idempotency/dedupe
- `messages(session_id, parent_client_message_id)` — for threading
- `study_materials(subject_id, topic_id, level, type)` — for filtered search
- `study_materials(tags)` — GIN — for keyword search
- `ai_usage_logs(provider, created_at)` — for provider metrics
- `recommendation_history(session_id, created_at)` — for session recommendation context

### 1.5 AI Provider / Fallback Summary

**Architecture:**
- `AIOrchestratorService` is the single entry point for all AI generation
- It maintains a priority-ordered list of provider candidates: `[requestedProvider, sessionProvider, defaultProvider, fallbackProvider]`
- Each provider goes through `ProviderHealthService.canAttempt()` — returns `allowed: false` if in cooldown
- Each candidate gets up to `maxRetries` attempts
- Error classification: `retryable` vs. `fatal` based on error message patterns
- On `retryable` errors: retry within same provider
- On all failures: try next provider in the ordered list
- On all provider failures: if `AI_LOCAL_FALLBACK_ENABLED=true`, return structured local fallback response
- On all failures + local fallback disabled: return error response

**Providers:**
- `GeminiAdapter` — uses `@google/genai`, streaming via server-sent chunks
- `OpenAIAdapter` — uses `openai` Responses API, streaming via final response

**Context management:**
- Last 20 messages retrieved for context
- Context window compacted if total chars exceed `AI_MAX_PROMPT_CHARS`
- System prompt built via `buildStudySystemPrompt()` with language, subject hint, and retrieval context
- `RetrievalService` pulls top 5 materials by keyword + history + featured boost and injects into system prompt

**Health/cooldown system:**
- `ProviderHealthService` maintains in-memory state per provider
- On success: `recordSuccess()` clears cooldown
- On retryable failure: `recordFailure()` increments failure count
- After 3 failures within 5 minutes: 30-second cooldown
- Health state exposed via `/api/providers` and `/health`

**Local study fallback:**
- Fully structured Markdown response with language-aware copy
- Detects keywords from question for topic normalization
- Generates 3-part checklist and follow-up prompt suggestions
- Clearly labels itself as "medium confidence" in both Vietnamese and English
- Explains why fallback is being used and how to restore real AI

### 1.6 Chat / Session / Message Flow Summary

1. User enters name → `POST /api/auth/login` → JWT access token + refresh token stored in Zustand (persisted)
2. Dashboard mounts → `useAuthBootstrap()` verifies token → user authenticated
3. Session sidebar loads → `GET /api/chat/sessions` → sessions displayed grouped by recency
4. User selects session → `GET /api/chat/sessions/:id/messages` → messages loaded
5. User types message → `ChatComposer` (Enter submits)
6. `useChatSocket().sendMessage()` inserts optimistic messages into TanStack Query cache
7. If socket connected: `emit('chat:send_message')` → server `ask()` pipeline → streaming chunks via `chat:ai_chunk` → final `chat:ai_done`
8. If socket disconnected: `POST /api/chat/ask` HTTP fallback → direct response
9. On disconnect: streaming messages marked `needs_sync` → on reconnect: `chat:join_session` + `chat:sync_state` → messages reconciled
10. Session title auto-generated from first message content via `buildSessionTitle()` (heuristic, Vietnamese-aware)
11. Context summary updated after each response via `buildContextSummary()` (heuristic concatenation)
12. Recommendations invalidated on `chat:ai_done`

### 1.7 Materials / Recommendation Summary

**Keyword extraction** (`extractKeywords`): strips stop words, splits on non-alphanumeric, filters ≤2-char tokens, returns top matches.

**Recommendation ranking** (`MaterialsService.rankRecommendations`):
- `isFeatured`: +15 points
- `subject match`: +35 points
- `topic match`: +30 points
- `level match`: +15 points
- `type match`: +10 points
- `keyword hits in text`: +8 per hit
- `history keyword hits`: +5 per hit (recent chat context boost)

**Retrieval service**: builds `RetrievalContext` with top 5 materials, extracts inferred subject/topic, generates prompt context string for system prompt injection.

**UI display**: `MaterialsPanel` shows material cards with title, type badge, subject, match percentage. `MessageSources` shows per-message retrieval details (expandable details element).

### 1.8 Study Artifact System Summary

**Artifact types:** `summary`, `flashcard_set`, `quiz_set`, `note`

**Generation flow:**
1. User clicks artifact button on a message bubble
2. `generateArtifactMutation` calls `POST /api/artifacts/generate`
3. Backend extracts source content from the message
4. AI generates structured JSON via `buildArtifactSystemPrompt()` + `buildArtifactUserPrompt()`
5. JSON parsed, validated, and stored in `study_artifacts` table
6. On success: artifacts query invalidated, toast shown

**Storage:** `StudyArtifact` model with `messageId` reference, `sessionId` reference, JSON `content`.

**Rendering (`ArtifactPreview`):**
- **Summary**: bullet points + tag pills
- **Flashcard set**: interactive flip cards (click front to reveal back)
- **Quiz set**: MCQ questions with reveal answer + explanation
- **Note**: body text + tag pills

**Artifact drawer**: Slide-in panel showing all artifacts for the session, filterable by type, with count badges.

### 1.9 Current UI / Layout Summary

**Layout:** CSS Grid `workspace-grid lg:grid-cols-[220px_minmax(0,1fr)]` — fixed 220px sidebar + fluid main panel.

**Typography:** Space Grotesk (headings) + Manrope (body), loaded via `@fontsource`.

**Color system:** Custom Tailwind colors — `ocean`, `cyan`, `ink` + semantic tokens. Dual light/dark mode via `data-theme` attribute.

**Animation:** Framer Motion for page transitions, drawers, and panel reveals. CSS transitions for micro-interactions.

**Responsive:**
- Desktop: sidebar always visible + main panel
- Mobile: sidebar as overlay, context/artifact drawers as full overlays

**Visual style:** Glass morphism panels (`backdrop-blur-xl`, semi-transparent backgrounds), soft rounded corners (`rounded-2xl`), subtle borders, teal-cyan accent system.

---

## 2. Current Product Maturity

### 2.1 What Already Feels Complete

| Area | Maturity | Evidence |
|------|----------|----------|
| Guest authentication | Strong | Full JWT auth, refresh token rotation, localStorage persistence, bootstrap flow |
| Real-time chat | Strong | Socket.IO with ACK pattern, chunk streaming, reconnect recovery, optimistic UI |
| Provider fallback | Strong | Gemini → OpenAI → local fallback, error classification, cooldown system, health service |
| Message persistence | Strong | Prisma + PostgreSQL, deduplication by `clientMessageId`, status tracking |
| Session management | Good | Create, delete, rename, pin, archive — full CRUD with recency grouping |
| Materials recommendation | Good | Keyword-based ranking with multi-signal scoring, featured boost, history boost |
| Study artifacts | Good | All 4 types (summary, flashcard, quiz, note) generated, stored, rendered, browsable |
| Diagnostic system | Good | Provider diagnostics panel, latency, incidents, usage metrics |
| Retrieval pipeline | Good | Context built from materials catalog, injected into AI system prompt |
| Error handling | Good | Centralized error handler, structured error envelopes, toast notifications |
| Input validation | Good | Zod schemas throughout, both client and server side |
| Rate limiting | Good | Per-route rate limits (auth: 20/min, ask: 20/min, chat: 45/min, materials: 60/min) |
| Socket resilience | Good | Auto reconnect, session recovery, needs_sync marking, HTTP fallback |
| UI polish | Good | Glass morphism, dark mode, responsive, loading skeletons, empty states, error banners |
| Architecture | Good | Clean separation: services, repositories, controllers, adapters, hooks, stores |
| Shared contracts | Good | `packages/shared` with typed schemas, contracts, prompts, and constants |

### 2.2 What Already Adds Real Value

- **Streaming responses** — feels alive and responsive, not a loading spinner
- **Provider switching** — user agency over AI provider
- **Flashcard/quiz generation** — concrete study artifacts from any answer
- **Recommendation system** — contextual material suggestions that actually boost relevant results
- **Session grouping by recency** — natural organization of learning history
- **Archive/pin** — organizational control for returning students
- **Local fallback** — product never breaks, even without API keys
- **Diagnostic panel** — transparency into why things work or fail
- **Retrieval snapshots** — users can see which materials informed each answer

### 2.3 What Already Works Well Technically

- The AI orchestrator's provider ordering and retry logic is well-designed
- The `ChatGuardService` rate limiting prevents abuse
- Optimistic UI updates make the chat feel instant
- The idempotency via `clientMessageId` prevents duplicate messages on retry/reconnect
- The session recovery flow (`chat:sync_state`) properly reconciles state after disconnects
- The Prisma schema has well-designed indexes for all query patterns
- The seed data covers 4 subject areas with realistic materials

### 2.4 What Should Not Be Rewritten

- **Socket architecture** — the ACK pattern, recovery flow, and chunk streaming work well
- **AI orchestration** — the provider ordering, fallback cascade, and error classification are solid
- **Session management** — the pin/archive/rename/grouping model is appropriate
- **Artifact generation** — the prompt-based JSON generation approach is production-appropriate
- **Material recommendation** — the multi-signal scoring approach is appropriate for a keyword-based system
- **Auth flow** — JWT + refresh token rotation is the right pattern for this product
- **UI shell** — the glass morphism aesthetic and layout are coherent and professional

---

## 3. Remaining Product Gaps

### 3.1 User-Facing Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| Artifacts cannot be refined or edited after generation | Users must regenerate to change flashcard/quiz content | Medium |
| No dedicated study review mode for flashcards/quiz | Artifacts are passive — no spaced-repetition or quiz-taking UX | High |
| No artifact bookmarking or favorites | Users cannot mark artifacts to review later without opening the session | Medium |
| Session rename is purely heuristic (auto-generated) — not smart | "Tro chuyen moi" sessions don't auto-rename until first message | Low |
| No session export (PDF, markdown) | Users cannot download a session or artifact for offline use | Medium |
| Recent materials visibility is limited to sources under individual messages | No unified "recently used materials" panel across a session | Low |
| No search across all messages in a session | Users cannot find a specific answer within a long session | Medium |
| No "continue learning" prompt suggestions | Nothing guides users back to incomplete or old sessions | Low |

### 3.2 System / Product Gaps

| Gap | Impact | Severity |
|------|--------|----------|
| No test suite for frontend components | Regression risk as UI grows | High |
| E2E tests exist but are minimal | Only 4 test files with basic coverage | High |
| OpenAI adapter streaming is incomplete | Uses final response, not real SSE chunks | Medium |
| No structured output for artifact generation | Relies on JSON parsing with cleanup regex — fragile | Medium |
| Context summary is heuristic (text concatenation) | Not AI-generated, quality degrades with long sessions | Medium |
| Subject/topic inference is keyword-based | Not using structured output from the AI | Medium |
| No Redis for Socket.IO horizontal scaling | Single-server only; multi-instance deployments lose socket events | Medium |
| No embedded analytics or product metrics | No visibility into how users actually use the product | Medium |
| No user onboarding flow | New users land directly in the dashboard without guidance | Low |
| No usage quotas or billing | Guest model — no per-user limits or visibility | Low |

### 3.3 Trust / Transparency Gaps

| Gap | Impact | Severity |
|------|--------|----------|
| Local fallback response does not clearly state it's AI-generated advice vs. real data | Users may confuse fallback responses with real AI quality | Medium |
| No "answer quality" or confidence indicator beyond fallback label | No visibility into how reliable a given answer is | Low |
| No citation format — materials are shown but not inline-referenced | Users see sources panel but can't correlate inline claims to specific materials | Medium |

---

## 4. Feature Family Evaluation

### 4.1 Flashcard + Quiz + Note Refinement

**Current support already present:**
- Full artifact generation: summary, flashcard_set, quiz_set, note (all 4 types)
- Artifact storage in PostgreSQL with session and message references
- Interactive flip card UI for flashcards
- MCQ quiz UI with reveal + explanation
- Artifact drawer for browsing artifacts per session
- Artifact type filtering in drawer
- Delete artifacts
- Per-message artifact generation buttons

**Missing pieces:**
- **Artifact editing/refinement** — users cannot modify a flashcard or quiz after generation
- **Study review mode** — no spaced-repetition, no quiz-taking flow, no progress tracking
- **Artifact cross-session browsing** — artifacts are per-session; no global "my flashcards" view
- **Structured output validation** — artifact JSON is parsed with regex cleanup; no schema enforcement
- **Artifact refinement prompts** — no "make this easier/harder" or "add more questions" flow
- **Note editor** — notes are AI-generated static content; no user editing

**Product impact:** Medium. Artifacts are a strong differentiator but currently read-only. Adding refinement and study review mode transforms them from "outputs" to "tools."

**UX impact:** High. A spaced-repetition flashcard study mode would make this a genuine learning tool, not just a chat interface.

**Technical complexity:** Medium. Study review mode requires new UI flows, state management, and potentially new data models (review history, spaced repetition scheduling).

**Architectural fit:** Good. The artifact system already exists with clean service/repository separation. Refinement would add a new service method and a new UI flow.

**Priority:** **P1** — High product value with medium complexity. Refinement is the natural next step for a generation system.

### 4.2 Sources / Citations / Recent Materials Visibility

**Current support already present:**
- `MessageSources` component showing retrieval materials per message
- Expandable details section under each assistant message
- Shows title, subject, topic, match score, snippet, reason tags, and external link
- `RetrievalService` builds full `RetrievalSnapshot` with materials, scores, and reasoning
- `RetrievalSnapshot` persisted on every message via `retrievalSnapshot` JSON column
- `RetrievalSnapshot` shown in the `ContextDrawer` under "Recent Sources" (last sourced message)
- Material cards in `MaterialsPanel` show match percentage and reason chips

**Missing pieces:**
- **Inline citation format** — no superscript or footnote linking specific claims to sources
- **Unified recent materials panel** — "Recent Sources" only shows the last sourced message's materials
- **Source filtering by session** — cannot see all materials used across a whole session
- **Source bookmarking** — cannot save a specific material for later
- **Citation count indicator** — no way to see how many times each material was cited

**Product impact:** Medium. The foundation is strong — every answer carries its retrieval context. The missing pieces are surface-level UI additions.

**UX impact:** Medium. Inline citations would make source transparency much clearer. Unified recent materials would reduce friction to revisit materials.

**Technical complexity:** Low to Medium. Most additions are frontend UI work. Citation formatting would need careful design. Source bookmarking requires a new DB table.

**Architectural fit:** Excellent. The `RetrievalSnapshot` model already exists. Adding a citation display format and a unified panel requires minimal backend changes.

**Priority:** **P1** — Strong trust/playback value. The infrastructure already exists; the missing pieces are mostly UI polish on top of existing data.

### 4.3 Session Management Maturity

**Current support already present:**
- Full CRUD: create, read, update (rename), delete sessions
- Pin/unpin with `pinnedAt` timestamp
- Archive/unarchive with `archivedAt` timestamp
- Session grouping by recency: "Today", "Yesterday", "Recent 7 days", "This week", "Older"
- Session search by title and `lastMessagePreview`
- Per-session provider preference (`providerPreference` field)
- `lastMessagePreview` in `ChatSessionSummary` for search previews
- `messageCount` and `artifactCount` in session summaries for UI badges
- `contextSummary` field for session-level topic tracking
- Inline rename via double-click in sidebar
- Session auto-rename on first message (via `buildSessionTitle`)
- Active session auto-select on mount

**Missing pieces:**
- **Session description** — no way to add a short description beyond the title
- **Session tags/labels** — no way to categorize sessions by subject or topic
- **Session duplication** — no "clone session" to start a new session with same context
- **Bulk operations** — no multi-select for bulk archive/delete
- **Session export** — no download as markdown or PDF
- **"Continue learning" entry point** — nothing surfaces sessions that haven't been revisited recently
- **Session merge** — no way to combine two sessions
- **Search across messages** — no full-text search within a session

**Product impact:** Medium. The current session management is already solid. The missing pieces are refinements for long-term users with many sessions.

**UX impact:** Medium. Session tags and descriptions would help power users organize their learning. Search across messages is a significant gap for long sessions.

**Technical complexity:** Low to Medium. Most additions are schema fields and UI changes. Message search requires PostgreSQL full-text search or FTS.

**Architectural fit:** Good. The session model already supports pin/archive. New fields (description, tags) fit naturally.

**Priority:** **P2** — Useful for long-term users but not blocking the core loop. Recommend as a Phase 2 item.

### 4.4 Trust / Fallback / Provider Transparency

**Current support already present:**
- `ProviderDiagnosticsPanel` with per-provider status, latency, request counts, error counts, fallback counts
- Recent incidents list with error code + message
- `ProviderBadge` on every message showing which provider answered
- Amber/fallback styling when `fallbackUsed: true`
- `UsageMeta` showing latency, tokens, and non-stop finish reason
- `AIWarnings[]` array surfaced in `ChatAskResponse`
- `/health` endpoint exposing AI mode (real / fallback-only / unavailable)
- `pnpm ai:doctor` script for server-side diagnostics
- `AI_LOCAL_FALLBACK_ENABLED` for controlling fallback behavior
- `AI_STARTUP_STRICT` for blocking startup without real AI
- Structured local fallback with "confidence: medium" labels in both Vietnamese and English
- Clear error codes throughout (`CHAT_RATE_LIMITED`, `TOO_MANY_STREAMS`, etc.)
- Toast notifications for message failures with error codes

**Missing pieces:**
- **Per-message confidence indicator** — no visual signal of answer quality beyond provider badge
- **Fallback explanation** — when using local fallback, a clear explanation of why real AI failed
- **Token budget visibility** — no user-facing "approaching limits" warning
- **Provider latency comparison** — no UI showing latency history/trends
- **"Powered by" label** — no subtle branding on answers indicating AI provider

**Product impact:** Low to Medium. The transparency system is already comprehensive. The missing pieces are incremental improvements.

**UX impact:** Low. The current system communicates status well. Small additions would incrementally improve clarity.

**Technical complexity:** Low. Most additions are frontend display changes.

**Architectural fit:** Excellent. The infrastructure for provider transparency is already very strong.

**Priority:** **P3** — Incremental polish. The system is already trustworthy. This is refinement work.

### 4.5 Hardening / Testing / Polish

**Current support already present:**
- Error boundaries on frontend
- Centralized error handler on backend
- Request ID logging throughout
- Structured error envelopes (`ApiErrorEnvelope`)
- Rate limiting on all routes
- Input validation (Zod) on all endpoints
- Zod schemas in shared package for contract enforcement
- Helmet, CORS configured
- Socket.IO reconnection with auto recovery
- HTTP fallback when socket is unavailable
- `ChatGuardService` for in-flight rate limiting
- `ai:doctor` diagnostics script
- Playwright E2E setup with `playwright.config.ts`
- Test files for: auth routes, materials routes, materials service, chat socket, AI orchestrator, local study fallback, login page, chat message bubble, provider diagnostics panel

**Missing pieces:**
- **Frontend unit tests** — only 2 component tests exist (`login-page`, `chat-message-bubble`, `provider-diagnostics-panel`)
- **Backend integration tests** — only some modules have tests; no API-level integration tests
- **E2E tests** — Playwright config exists but tests are minimal
- **CI/CD pipeline** — no GitHub Actions workflow for lint/typecheck/test/build gates
- **Input sanitization** — XSS prevention relies on `rehype-sanitize` only; no server-side sanitization
- **CORS origin validation** — `corsOriginDelegate` is used but the implementation should be audited
- **Health check alerts** — no monitoring for `/health` endpoint degradation
- **Graceful shutdown** — backend server shutdown behavior should be verified
- **Environment validation** — no startup validation of required env vars (API keys, DATABASE_URL)

**Product impact:** High. The lack of frontend tests and CI/CD is a significant gap for long-term maintainability.

**UX impact:** None directly — this is pure engineering infrastructure.

**Technical complexity:** Medium to High. CI/CD setup, comprehensive test suites, and security hardening require significant investment.

**Architectural fit:** N/A — this is infrastructure work.

**Priority:** **P1** — Essential for production readiness. The backend is moderately well-tested; the frontend is undertested.

---

## 5. Full Phased Roadmap

### Phase 0 — Production Hardening Baseline

**Status:** COMPLETED (2026-04-26)
**Objective:** Establish a reliable baseline of tests, CI/CD, and security hardening before building new features.
**Why this phase matters:** Building new features on an untested foundation compounds risk. A CI/CD pipeline ensures every change is validated. Security hardening protects users and data.
**Estimated complexity:** Medium

| Item | Details |
|------|---------|
| **Backend changes** | `gracefulShutdown()` handler to HTTP server and Socket.IO with timeout, duplicate shutdown guard, uncaught exception/unhandled rejection handlers, `shuttingDown` flag, `prisma.$disconnect()` outside `httpServer.close` callback. Added `JWT_SECRET` placeholder check in production mode (`apps/api/src/config/env.ts`). |
| **Frontend changes** | Added tests for: `SessionSidebar`, `ArtifactDrawer`, `ArtifactPreview`, `ChatComposer`, `MaterialsPanel`, `use-chat-socket`. Added reload button to `ErrorBoundary`. Added `afterEach(cleanup)` to all React Testing Library test files. |
| **Backend tests added** | `chat-guard.service.test.ts` (14 tests): `normalizeMessage`, `assertCanAsk`, `assertCanRetry` coverage. `chat.routes.test.ts` (11 tests): `ChatController` unit tests for all CRUD operations. |
| **Frontend tests added** | `session-sidebar.test.tsx` (12 tests), `artifact-drawer.test.tsx` (11 tests), `artifact-preview.test.tsx` (10 tests), `chat-composer.test.tsx` (9 tests), `materials-panel.test.tsx` (12 tests), `use-chat-socket.test.tsx` (21 tests). |
| **CI/CD changes** | Added `.github/workflows/ci.yml` with lint, typecheck, test, build gates for all packages (shared, api, web). Concurrent job execution with cancel-in-progress. |
| **Database changes** | None |
| **Shared types changes** | None |
| **Files/modules affected** | `apps/api/src/server.ts`, `apps/api/src/config/env.ts`, `apps/api/test/chat-guard.service.test.ts`, `apps/api/test/chat.routes.test.ts`, `apps/web/test/*.test.tsx`, `apps/web/src/components/ui/ErrorBoundary.tsx`, `.github/workflows/ci.yml` |
| **Dependencies** | None — builds on existing test infrastructure |
| **Risks** | Some tests required careful mocking of Express middleware chain; React Testing Library auto-cleanup required explicit `afterEach(cleanup)` calls across all test files. |
| **Acceptance criteria** | ✅ All `pnpm test` tests pass (135 total: 57 API + 78 web). ✅ GitHub Actions workflow created at `.github/workflows/ci.yml`. ✅ Env validation blocks startup on missing required vars. ✅ `pnpm typecheck` passes. ✅ `pnpm lint` passes. ✅ `pnpm build` produces valid output. |
| **Validation checklist** | `pnpm typecheck` ✅ passes; `pnpm lint` ✅ passes; `pnpm test` ✅ passes (57 API, 78 web); `pnpm build` ✅ produces valid output; GitHub Actions CI workflow ✅ created |
| **Definition of Done** | ✅ Every PR triggers CI/CD pipeline. Frontend has component tests for key UI surfaces. Backend has service/controller tests for critical flows. Env validation at startup. Graceful shutdown implemented. |

---

### Phase 1 — Artifact Refinement + Study Review Mode

**Status:** NOT STARTED  
**Objective:** Transform artifacts from passive outputs into active study tools. Users can refine AI-generated content and take self-assessed quizzes.  
**Why this phase matters:** Flashcards and quizzes that can't be refined or reviewed are half-baked. Adding a study mode makes this a genuine learning tool, not just an AI answer generator. This creates the "review later" loop in the product vision.  
**Estimated complexity:** Medium

**Scope:** This phase adds editing capabilities to artifacts and a new study review mode for flashcard sets and quizzes.

**In-scope items:**
- Refine artifact: edit flashcard front/back, edit quiz questions, edit note content, regenerate specific items
- "Make this easier/harder" refinement prompts injected into AI generation
- Study review mode: present flashcard deck one card at a time with self-assessment (Know / Don't Know)
- Study review mode: present quiz questions one at a time with answer reveal + explanation
- Session-level review: review all flashcards or all quiz questions from a session
- "Study this session" entry point from session sidebar
- Review history: track which cards/questions were answered correctly (new DB table)

**Out-of-scope items:**
- Spaced repetition algorithm (simple sequential review only)
- User-generated flashcards (AI generation only)
- Cross-session study decks (session-level only)
- PDF/markdown export

| Item | Details |
|------|---------|
| **Backend changes** | New `StudyReviewService` for review session management. New `ReviewHistory` table: `(id, userId, artifactId, itemIndex, selfAssessment, reviewedAt)`. New `PATCH /api/artifacts/:id/refine` endpoint for artifact editing. `ArtifactsService` gets `refine()` method. `buildArtifactUserPrompt()` gets refinement variant. |
| **Frontend changes** | New `StudyReviewPage` (or inline study mode in dashboard). `ArtifactPreview` gets edit mode toggle. `ArtifactDrawer` gets "Study" button. `ChatMessageBubble` artifact buttons get "Refine" dropdown. New `useStudyReview` hook. |
| **Database/schema changes** | New `ReviewHistory` model with indexes on `(userId, reviewedAt)` and `(artifactId)`. |
| **Shared types/contracts changes** | New `ReviewHistory` type, `RefineArtifactInput` schema, `StudyReviewMode` type. |
| **Files/modules affected** | `apps/api/src/modules/review/` (new), `apps/api/src/modules/artifacts/`, `apps/web/src/features/study-review/` (new), `apps/web/src/components/chat/ArtifactPreview.tsx`, `apps/web/src/components/layout/ArtifactDrawer.tsx`, `apps/web/src/components/chat/ChatMessageBubble.tsx`, `packages/shared/src/types/review.ts` (new) |
| **Dependencies** | Phase 0 (test baseline), Artifact system (already exists) |
| **Risks** | Structured output fragility in refine prompts. Review mode adds new state management complexity. Flashcard flip state needs careful UX. |
| **Acceptance criteria** | User can edit flashcard front/back. User can edit quiz questions. User can take sequential flashcard review. User can take sequential quiz review. Review history is persisted. Refined artifacts replace originals. |
| **Validation checklist** | Refine edits save correctly. Flashcard review cycles through all cards. Quiz reveals answers on click. Review history reflects self-assessment. Refine prompts generate coherent refinements. |
| **Definition of Done** | All artifact types support refinement. Study review mode works for flashcards and quizzes. Review history is queryable. Refined content is persisted and replaces original. |

---

### Phase 2 — Session Workspace Maturity

**Status:** COMPLETED (2026-04-27)  
**Objective:** Transform the session sidebar into a mature study workspace navigator.
**Why this phase matters:** Users returning after days away face a cluttered session list with no clear re-entry point. Pinned sessions are buried in recency buckets, search is local-only, and session actions are discoverable only through hover. This phase makes the workspace genuinely useful for long-term learning.  
**Estimated complexity:** Medium

**Scope:** Continue-learning entry point, session search polish, pinned session grouping fix, right-click context menu, keyboard shortcuts.

**In-scope items (all implemented ✅):**
- "Tiếp tục học" (Continue Learning) entry point: surfaces up to 3 sessions with recent activity but `updatedAt` older than 1 day
- Server-side session search matching `title` and `messages.content` via `ILIKE`
- Dedicated "Đã ghim" (Pinned) section rendered above recency groups
- Right-click context menu on session items: Rename, Pin/Unpin, Archive, Restore, Delete
- `Cmd/Ctrl+K` keyboard shortcut to focus search
- Search now matches `contextSummary` in addition to `title` and `lastMessagePreview`

**Out-of-scope items (deferred to Phase 3):** Session tags, session descriptions, session duplication, session export, cross-session artifact browsing, "Save material" bookmarking, citation display.

| Item | Details |
|------|---------|
| **Backend changes** | `GET /api/chat/sessions/continue-learning` endpoint (repository/service/controller). `GET /api/chat/sessions/search?q=` endpoint (repository/service/controller). `sessionSearchSchema` in `schemas/chat.ts`. |
| **Frontend changes** | New `use-continue-learning.ts` hook. Refactored `SessionSidebar.tsx`: pinned section, right-click `ContextMenu`, `Cmd/Ctrl+K` shortcut, `continueLearningSessions` prop. Updated `format.ts`: `groupSessionsByRecency` returns `GroupedSessions` with separate `pinned` and `groups`. `DashboardPage.tsx` fetches and passes `continueLearningSessions`. `chat-service.ts` exports `fetchContinueLearningSessions` and `searchSessions`. `query-keys.ts` added `continueLearning` and `sessionSearch` keys. |
| **Database/schema changes** | None — uses existing `ChatSession` model and indexes |
| **Shared types/contracts changes** | `sessionSearchSchema` added to `schemas/chat.ts` |
| **Files/modules affected** | `apps/api/src/modules/chat/chat.repository.ts`, `apps/api/src/modules/chat/chat.service.ts`, `apps/api/src/modules/chat/chat.controller.ts`, `apps/api/src/modules/chat/chat.routes.ts`, `packages/shared/src/schemas/chat.ts`, `apps/web/src/hooks/use-continue-learning.ts` (new), `apps/web/src/services/chat-service.ts`, `apps/web/src/utils/query-keys.ts`, `apps/web/src/utils/format.ts`, `apps/web/src/components/layout/SessionSidebar.tsx`, `apps/web/src/features/dashboard/DashboardPage.tsx`, `apps/web/test/session-sidebar.test.tsx`, `apps/api/test/chat.routes.test.ts` |
| **Dependencies** | Phase 0 |
| **Risks** | Continue-learning query adds a small DB read per sidebar load. 24h threshold is a reasonable heuristic. |
| **Acceptance criteria** | ✅ `GET /sessions/continue-learning` returns sessions inactive >24h. ✅ `GET /sessions/search?q=` matches title and message content. ✅ Pinned sessions in "Đã ghim" section above recency groups. ✅ Right-click opens context menu. ✅ Cmd/Ctrl+K focuses search. ✅ Search matches `contextSummary`. |
| **Validation checklist** | `pnpm typecheck` ✅ passes; `pnpm lint` ✅ passes; `pnpm test` ✅ 100 tests pass; `pnpm build` ✅ succeeds |
| **Definition of Done** | ✅ All items implemented and validated. |

---

### Phase 3 — Global Discovery + Export

**Status:** NOT STARTED  
**Objective:** Enable users to find content across all sessions and export their learning artifacts.  
**Why this phase matters:** A true learning workspace needs to be searchable. Users with 20+ sessions need to find old answers. Export turns the workspace into a portable study resource.  
**Estimated complexity:** Medium

**In-scope items:**
- Global session search: search sessions by title, description, tags, or last message preview
- Global message search: search all messages across all sessions
- Session export: download session as formatted markdown
- Artifact export: download flashcards/quiz as markdown or PDF
- Artifact sharing: generate a shareable link for a specific artifact (public read-only view)
- Cross-session artifact collection: "My flashcards" view across all sessions
- Per-artifact favorite/bookmark

**Out-of-scope items:**
- Collaborative sharing (multi-user sessions)
- PDF generation server-side (client-side PDF via library)
- AI-generated session summaries for export

| Item | Details |
|------|---------|
| **Backend changes** | New `GET /api/chat/sessions/search?q=` (global). New `GET /api/messages/search?q=` (all messages). `StudyArtifact` gets `isFavorited` field. New artifact sharing: generate signed URL token for public artifact view. New `GET /api/artifacts/export/:id` returning markdown. |
| **Frontend changes** | Global search in sidebar header (search icon + dropdown). Search results show sessions and messages grouped. "Export" menu in `WorkspaceSettingsSheet`. "My Flashcards" view in `ArtifactDrawer`. Favorite toggle on artifact cards. Share button on artifact preview. |
| **Database/schema changes** | Add `isFavorited BOOLEAN` to `study_artifacts` (migration). Add `shareToken TEXT UNIQUE` to `study_artifacts` (migration). |
| **Shared types/contracts changes** | New `GlobalSearchResult` type. New `ArtifactExportFormat` type. |
| **Files/modules affected** | `apps/api/src/modules/chat/`, `apps/api/src/modules/artifacts/`, `apps/web/src/components/layout/SessionSidebar.tsx`, `apps/web/src/components/layout/ArtifactDrawer.tsx`, `apps/web/src/components/chat/ArtifactPreview.tsx` |
| **Dependencies** | Phase 1, Phase 2 |
| **Risks** | Global message search can be slow on large datasets — needs pagination and debouncing. PDF export requires client-side library (e.g., `jspdf`, `html2canvas`). Share token security needs careful implementation. |
| **Acceptance criteria** | Global search returns sessions and messages. Export produces valid markdown. Share links open a read-only artifact view. My Flashcards shows cross-session collection. Favorites persist. |
| **Validation checklist** | Global search debounced at 300ms. Export markdown is readable. Share links expire after 7 days. Favorites reflected in drawer and My Flashcards. |
| **Definition of Done** | All features functional. Search results are ranked by relevance. Export files open in markdown readers and browsers. Share links are cryptographically secure. |

---

### Phase 4 — AI Quality + Structured Output

**Status:** IN PROGRESS (substantially implemented)  
**Objective:** Improve AI output quality through structured output, better context management, and AI-powered session understanding.  
**Why this phase matters:** The current heuristic-based context summary and title generation degrade with long sessions. Structured output and AI-powered session analysis make the product smarter over time.  
**Estimated complexity:** High

**In-scope items:**
- Structured output for artifact generation — implemented as the primary path via `StructuredOutputService`
- Legacy JSON parsing retained only as a secondary rescue path
- AI-powered session summary for sessions with 10+ messages
- Subject/topic/level inference via structured output plus heuristic fallback
- Per-message confidence indicator (compact UI pill)
- Artifact quality scoring surfaced in artifact previews

**Out-of-scope items:**
- Embedding-based retrieval (Phase 5 — future)
- Multi-modal support (Phase 5 — future)
- Instructor dashboard (Phase 5 — future)
- Thread welcome topic chips and a dedicated "AI quality mode" settings toggle (deferred to avoid UI noise until the product semantics are stronger)

| Item | Details |
|------|---------|
| **Backend changes** | Added `StructuredOutputService` for provider-aware schema validation with explicit legacy fallback. Added `SessionIntelligenceService` for turn intelligence + long-session summary generation. Updated `ArtifactsService` to prefer structured output. Updated OpenAI and Gemini adapters to support structured JSON mode. |
| **Frontend changes** | Added compact confidence pill in `ChatMessageBubble` and artifact quality badge in `ArtifactPreview`. Kept UI changes intentionally subtle to preserve workspace calm. |
| **Database/schema changes** | Added `confidenceScore`, `subjectLabel`, `topicLabel`, `levelLabel` to `messages`. Added `qualityScore` to `study_artifacts`. Migration `20260428183000_phase4_structured_output_quality` created. |
| **Shared types/contracts changes** | Added `ConfidenceLevel`, structured turn/session schemas, structured artifact schemas, prompt builders for session intelligence. |
| **Files/modules affected** | `apps/api/src/integrations/ai/structured-output.service.ts`, `apps/api/src/modules/chat/session-intelligence.service.ts`, `apps/api/src/modules/artifacts/artifacts.service.ts`, adapters, shared schemas/prompts/types, compact trust UI components, `prisma/schema.prisma` |
| **Dependencies** | Phase 1, Phase 2, Phase 3 |
| **Risks** | Structured output API support varies by provider/version. Extra AI calls increase latency and cost. Confidence scoring must not be misleading. |
| **Acceptance criteria** | Structured output is the primary artifact generation path. Legacy parsing is rescue-only. Long sessions get AI-generated summaries. Subject/topic/level and confidence flow through to messages. Quality metadata persists for artifacts. |
| **Validation checklist** | `pnpm typecheck` ✅, `pnpm test` ✅, `pnpm lint` ✅, `pnpm build` ✅. Added focused tests for structured output service, artifacts service, and session intelligence. Local DB sync still requires a running PostgreSQL instance/Docker Desktop. |
| **Definition of Done** | Phase 4 foundation is in place and validated. Remaining items are lightweight UI surfacing choices, not missing backend architecture. |

---

## 6. Phase Tracking Board

| Phase | Name | Status | Complexity | Dependencies | Key Deliverables |
|-------|------|--------|------------|--------------|------------------|
| Phase 0 | Production Hardening Baseline | **COMPLETED** | Medium | None | CI/CD pipeline, test coverage, env validation, graceful shutdown, JWT placeholder check |
| Phase 1 | Artifact Refinement + Study Review Mode | **COMPLETED** | Medium | Phase 0 | Quiz review mode (one-question-at-a-time, answer selection, reveal, explanations, score summary, retake), note usability (copy, expand/collapse, tags display), summary usability (copy bullets to clipboard, expand/collapse for >3 bullets), messageId traceability in artifact generation, quiz start button in artifact drawer, backend artifact route tests |
| Phase 2 | Session Workspace Maturity | **COMPLETED** | Medium | Phase 0 | Continue-learning endpoint (sessions inactive >24h), server-side session search (title + message content), dedicated "Đã ghim" pinned section in sidebar, right-click context menu (rename/pin/archive/delete), Cmd/Ctrl+K search shortcut, session contextSummary tooltip, search matches contextSummary, pinned sessions extracted from recency buckets |
| Phase 3A | Global Message Search | **COMPLETED** | Medium | Phase 0 | `GET /api/chat/sessions/global-search` endpoint (`$queryRaw` with `DISTINCT ON`), `GlobalSearchResult` shared type, `useGlobalSearch` hook (300ms debounce), sidebar wired to server-driven results, `SearchResultsList` component with loading/no-result/result states, click result navigates to session, backend tests for `globalSearch` controller |
| Phase 3B | Cross-Session Artifact Search | COMPLETED | Medium | Phase 0 | Search artifacts by content/title across all sessions, favorites, toggles |
| Phase 4 | AI Quality + Structured Output | IN PROGRESS | High | Phase 1, Phase 2, Phase 3 | Structured output artifacts, AI session intelligence, confidence/quality indicators, schema-backed trust metadata |

---

## 7. Recommended Next Phase

### Recommended: Finish Phase 4 Runtime Rollout

**Rationale:**

1. **Phase 4 foundation is now implemented.** The codebase has structured output, session intelligence, trust metadata, and focused tests, but the active dev/demo database still needs the new migration applied in a live runtime.

2. **The next real bottleneck is operational, not architectural.** A running PostgreSQL/Docker environment is needed to finish schema rollout and do a real provider-backed smoke test for structured artifact generation and long-session summarization.

**Transition plan:**
1. ✅ Implement Phase 0: CI/CD + test coverage + security hardening
2. ✅ Implement Phase 1: Artifact Refinement + Study Review Mode
3. ✅ Implement Phase 2: Session Workspace Maturity
4. ✅ Implement Phase 3A and 3B: Discovery + artifact search/favorites
5. Apply Phase 4 migration to the active runtime database
6. Smoke-test Gemini/OpenAI structured flows in a live chat session

---

## Appendix: Quick Reference

### Existing Feature Inventory

| Feature | Status | Location |
|---------|--------|----------|
| Guest login | ✅ Complete | `apps/api/src/modules/auth/`, `apps/web/src/features/auth/` |
| Real-time chat streaming | ✅ Complete | `use-chat-socket.ts`, `chat.socket.ts`, `chat.service.ts` |
| Session CRUD | ✅ Complete | `ChatSession` model, `chat.service.ts`, `SessionSidebar.tsx` |
| Session pin/archive | ✅ Complete | `ChatSession.isPinned`, `ChatSession.isArchived`, sidebar actions |
| Session grouping by recency | ✅ Complete | `groupSessionsByRecency()` in `utils/format.ts` |
| Session search | ✅ Complete | `SessionSidebar.tsx` search input |
| Message streaming | ✅ Complete | `chat:ai_chunk` → chunk append |
| Message retry | ✅ Complete | `retryMessage()` in `use-chat-socket.ts` |
| Message deduplication | ✅ Complete | `clientMessageId` unique constraint |
| Session recovery | ✅ Complete | `chat:sync_state` + `needs_sync` status |
| HTTP fallback | ✅ Complete | `askViaHttp()` in socket hook |
| AI provider switching | ✅ Complete | `providerPreference` per session |
| Provider fallback cascade | ✅ Complete | `AIOrchestratorService.generate()` |
| Local study fallback | ✅ Complete | `local-study-fallback.ts` |
| Rate limiting | ✅ Complete | `ChatGuardService`, Express `rateLimit` |
| Input validation | ✅ Complete | Zod schemas in `packages/shared/` |
| Materials recommendation | ✅ Complete | `MaterialsService.recommend()` |
| Materials search | ✅ Complete | `MaterialsService.search()` |
| Flashcard generation | ✅ Complete | `ArtifactsService`, `ArtifactPreview.tsx` |
| Quiz generation | ✅ Complete | `ArtifactsService`, `ArtifactPreview.tsx` |
| Quiz review mode | ✅ Complete | `QuizReviewMode` in `ArtifactPreview.tsx`, sequential navigation, score summary, retake |
| Summary generation | ✅ Complete | `ArtifactsService`, `ArtifactPreview.tsx` |
| Summary usability (copy/expand) | ✅ Complete | `SummaryContentView` in `ArtifactPreview.tsx`, copy bullets to clipboard, expand/collapse for >3 bullets |
| Note generation | ✅ Complete | `ArtifactsService`, `ArtifactPreview.tsx` |
| Note usability (copy/expand) | ✅ Complete | `NoteContentView` in `ArtifactPreview.tsx` |
| Artifact drawer | ✅ Complete | `ArtifactDrawer.tsx` |
| Artifact delete | ✅ Complete | `deleteArtifact()` |
| Global message search | ✅ Complete | `chat.repository.ts` `globalSearch()` (`$queryRaw` `DISTINCT ON`), `globalSearchSchema`, `useGlobalSearch` hook, `SearchResultsList` in `SessionSidebar.tsx` |
| Message sources display | ✅ Complete | `MessageSources.tsx` in `ChatMessageBubble.tsx` |
| Recent sources in drawer | ✅ Complete | `ContextDrawer.tsx` |
| Provider diagnostics | ✅ Complete | `ProviderDiagnosticsPanel.tsx`, `providers.service.ts` |
| Usage tracking | ✅ Complete | `UsageService`, `AiUsageLog` model |
| Provider health/cooldown | ✅ Complete | `ProviderHealthService` |
| Error boundaries | ✅ Complete | `ErrorBoundary.tsx`, `error.middleware.ts` |
| Dark mode | ✅ Complete | `useTheme.ts`, CSS custom properties |
| Responsive layout | ✅ Complete | CSS Grid + mobile overlays |
| Playwright E2E setup | ✅ Complete | `playwright.config.ts`, test files |
| Seed data | ✅ Complete | `prisma/seed.ts` |

### Known Technical Debt

| Item | Severity | Fix Complexity | Notes |
|------|----------|----------------|-------|
| OpenAI adapter uses final response (not streaming) | Medium | Low | Needs SSE handling for OpenAI Responses API streaming |
| Artifact JSON parsing uses regex fallback | Medium | Low | Should use structured output when supported |
| Context summary is heuristic (not AI-generated) | Medium | Medium | Should use lightweight AI call for 10+ message sessions |
| Frontend has minimal component tests | High | Medium | Phase 0 priority |
| No GitHub Actions CI/CD | High | Low | Phase 0 priority |
| No PostgreSQL full-text search index on messages | Low | Low | Add GIN index if Phase 2 proceeds |
| `DashboardPage.tsx` is very large (756 lines) | Low | Medium | Extract sub-components (connection banner, message list, etc.) |
| No graceful shutdown on server | Medium | Low | Phase 0 priority |
| Env vars not validated at startup | Medium | Low | Phase 0 priority |
| CORS delegate should be audited | Low | Low | Phase 0 priority |
