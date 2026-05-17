# Chatbot AI - Project Progress Checklist

**Last updated:** 2026-05-17  
**Repository:** `D:\LEARNCODE\Project_CV\Chatbot AI`  
**Release status:** NOT RELEASE READY

## 1. Snapshot

| Field | Value |
| --- | --- |
| Project | Chatbot AI - Vietnamese Study Assistant |
| Overall status | AI-L3 runtime remains validated, and the Low-L4 Local LoRA path has now completed a full Phase 9 targeted debugging cycle: eval-failure analysis, stronger eval suite, prompt-shape hardening, targeted v4 dataset, real CUDA retrain, registry activation, browser smoke, fallback validation, and persisted benchmark runs. Local latency held near `7.3s`, but the stronger Phase 9 benchmark score regressed from `local_lora v3=0.07` to `local_lora v4=0.06`, so stronger local tutor quality is still not claimed. |
| Current active task | `[~]` Close out Phase 9 as partial because the targeted v4 retrain completed but did not beat v3 on the stronger eval suite. |
| Next recommended task | Phase 10: evaluate a stronger small base model or redesign the eval/data strategy for the weakest categories instead of continuing the same SmolLM2 fine-tuning loop. |
| Risks / blockers | `[~]` `local_lora v4` stayed stable with `timeoutCount=0` and slightly better average latency than v3, but its score dropped from `0.07` to `0.06` on the stronger suite and still trails `internal_l3_tutor` (`0.32`). `[~]` External provider validation remains noisy because configured Gemini/OpenAI keys can hit quota or rate limits during smoke and eval work. `[~]` Direct `node apps/api/dist/server.js` from the repo root is still not the standardized startup path for this workspace. |

## 2. Progress Legend

| Symbol | Meaning |
| --- | --- |
| `[ ]` | NOT STARTED |
| `[~]` | IN PROGRESS |
| `[x]` | DONE |
| `[!]` | BLOCKED |

## 3. Phase Status

| Phase | Status | Done note |
| --- | --- | --- |
| 0 - Production Hardening Baseline | `[x] DONE` | Completed: env schema validation, JWT placeholder guard, graceful shutdown, error boundary, and CI workflow scaffolding.<br>Validated: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm exec prisma validate --schema prisma/schema.prisma`. |
| 1 - Artifact Refinement + Study Review | `[x] DONE` | Completed: artifact edit/refine flows plus runtime `ReviewHistory` persistence and quiz review UI wiring.<br>Validated through API/web tests, `pnpm test`, and `pnpm build`. |
| 2 - Session Workspace Maturity | `[x] DONE` | Completed: continue-learning endpoint, server-side session search, pinned grouping, and search shortcut behavior.<br>Validated through API/web tests and `pnpm test`. |
| 3A - Global Message Search | `[x] DONE` | Completed: global message search API, shared schema/types, and sidebar result rendering/navigation.<br>Validated through API/web tests and `pnpm test`. |
| 3B - Cross-Session Artifact Search | `[x] DONE` | Completed: artifact search, favorites, favorite toggle flow, and cross-session provenance in the UI.<br>Validated through API/web tests and `pnpm test`. |
| 4 - AI Quality + Structured Output | `[x] DONE` | Completed: structured artifact generation, session intelligence, confidence/quality metadata, and honest degraded-source fallback handling.<br>Validated through service tests, `pnpm typecheck`, `pnpm test`, and `pnpm build`. |
| 5 - Session UX Improvements | `[x] DONE` | Completed: lighter session rows, consolidated overflow menu, better title heuristics, and earlier auto-title timing.<br>Validated through targeted tests and `pnpm test`. |
| 6A - My Artifacts Workspace | `[x] DONE` | Completed: session/favorites/all-artifacts browse modes plus session provenance in artifact lists/cards.<br>Validated through API/web tests and `pnpm test`. |
| 6B - Export / Share Artifacts | `[x] DONE` | Completed: markdown export, share-token creation/reuse, revoke flow, public artifact API route, and read-only public artifact page.<br>Validated through API/web tests and `pnpm test`. |
| 6C - Stabilization / Performance Cleanup | `[x] DONE` | Completed: lazy-loaded routes/drawers, Vite manual chunking, and `ArtifactPreview` decomposition.<br>Validated through `pnpm build` and targeted tests. |
| 7A - Analytics + Learning Insights | `[x] DONE` | Completed: learning insights API aggregation, dashboard insights drawer, and shared types/query wiring.<br>Validated through API/web tests and `pnpm test`. |
| 7B - Batch Session Actions UI | `[x] DONE` | Completed: sidebar selection mode, batch archive/delete actions, and dashboard integration.<br>Validated through API/web tests and `pnpm test`. |
| 7C - Onboarding + Activation | `[x] DONE` | Completed: stronger first-run welcome surface, starter prompts, workspace activation guide, and dashboard signposting.<br>Validated through web tests and `pnpm test`. |
| AI-L3A - Artifact Refinement / Editing | `[x] DONE` | Completed: artifact content editing, refine flow, per-type validation, review-event persistence, and artifact editor UI.<br>Validated through API/web tests, migrations, `pnpm test`, and `pnpm build`. |
| AI-L3B - Training Dataset Manager | `[x] DONE` | Completed: `TrainingDataset` / `TrainingExample` schema, CRUD flows, approve/reject flow, exporters, training-job route, and AI Lab dataset workspace.<br>Validated through API/web tests, migrations, `pnpm test`, and `pnpm build`. |
| AI-L3C - Evaluation Harness | `[x] DONE` | Completed: `EvalCase` / `EvalRun` / `EvalRunResult` schema, eval case CRUD, persisted benchmark runs, heuristic scoring, and AI Lab eval views.<br>Validated through API/web tests, migrations, `pnpm test`, and `pnpm build`. |
| AI-L3D - Model Registry + Fine-Tune Adapter | `[x] DONE` | Completed: `ModelVersion` / `TrainingJob` schema, registry routes, model gateway wiring, and fine-tune adapter scaffolding.<br>Validated through API/web tests, migrations, `pnpm test`, and `pnpm build`. |
| AI-L3E - Runtime Mode Switch | `[x] DONE` | Completed: per-session runtime mode, internal tutor path, opt-in external fallback, diagnostics, and UI badges.<br>Validated through Prisma, lint, typecheck, tests, build, E2E, and AI doctor. |
| AI-L4 - Local LoRA / Fine-tuned Inference | `[~] IN PROGRESS` | Completed: failure analysis tooling, stronger Phase 9 eval suite, prompt-shape hardening for the local path, targeted v4 dataset seeding/audit, HF chat export (`162/18`), real LoRA v4 training on CUDA, real FastAPI serving, registry activation of `local-lora-tutor-v4`, browser smoke, Internal L3 fallback, and persisted v3/v4 benchmark runs on the stronger suite.<br>Current benchmark reality on the stronger Phase 9 suite: `internal_l3_tutor=0.32`, `local_lora v3=0.07`, `local_lora v4=0.06`, with local average latency improving slightly from `7611 ms` to `7355 ms` and `timeoutCount=0`. Phase 9 is partial because v4 did not beat v3 on quality. |

## 4. Validation Snapshot

| Check | Status | Evidence |
| --- | --- | --- |
| Prisma schema validation | `[x] DONE` | `pnpm exec prisma validate --schema prisma/schema.prisma` passed on 2026-05-17. |
| Prisma migrate status | `[x] DONE` | `pnpm exec prisma migrate status --schema prisma/schema.prisma` reported the database schema up to date with `14` migrations on 2026-05-17. |
| Prisma migrate deploy | `[x] DONE` | `pnpm exec prisma migrate deploy --schema prisma/schema.prisma` passed with no pending migrations on 2026-05-17. |
| Prisma generate | `[x] DONE` | `pnpm exec prisma generate --schema prisma/schema.prisma` passed on 2026-05-17 after stopping live Node watcher processes that held `query_engine-windows.dll.node` on Windows. |
| Lint | `[x] DONE` | `pnpm lint` passed for shared, API, and web on 2026-05-17. |
| Typecheck | `[x] DONE` | `pnpm typecheck` passed for shared, API, and web on 2026-05-17. |
| Unit/component tests | `[x] DONE` | `pnpm test` passed: API `39` files / `228` tests, web `17` files / `122` tests, total `56` files / `350` tests on 2026-05-17. |
| Build | `[x] DONE` | `pnpm build` passed for shared declarations, API `tsup`, and web `vite build` on 2026-05-17. |
| Playwright E2E | `[x] DONE` | `pnpm test:e2e` passed `6/6` specs on 2026-05-17. |
| AI doctor | `[x] DONE` | `pnpm ai:doctor` reported `/health` reachable, runtime mode `real`, `l3InternalModel=enabled`, `l3InternalModelName=internal-l3-tutor-v1`, and `l3ExternalFallbackAllowed=false` on 2026-05-17. |
| Python ML validation | `[x] DONE` | `python -m py_compile ml/scripts/train_lora_sft.py`, `python -m py_compile ml/scripts/serve_local_lora.py`, `python -m py_compile ml/scripts/validate_dataset.py`, `python -m py_compile ml/scripts/check_l4_environment.py`, and `python -m unittest discover ml/tests` passed on 2026-05-17. |
| Manual browser smoke | `[x] DONE` | On 2026-05-17, a real Local LoRA v4 browser smoke showed `Local LoRA Tutor / L4 Runtime / local-lora-tutor-v4`, recorded `10334 ms` latency on the local prompt, and still fell back correctly to `AI học tập Level 3 / L3 Tutor Model` after the local server was stopped. The local response quality remained visibly weak, so no stronger quality claim was made. |
| Provider-backed smoke | `[x] DONE` | External API mode showed an external badge on 2026-05-17, but the configured Gemini/OpenAI providers also surfaced honest quota/fallback warnings during the manual smoke. |

## 5. Open / Deferred Work

| Status | Item | Evidence / current limit |
| --- | --- | --- |
| `[~]` | Phase 9 closeout | Targeted v4 retraining completed, but the stronger suite score regressed from `0.07` to `0.06`; Phase 9 therefore closes as partial, not done. |
| `[~]` | Stronger base model or eval/data redesign | The current SmolLM2-based local path stayed stable and slightly faster, but the targeted retrain still did not improve tutor quality on the stronger suite. |
| `[~]` | Standalone built API boot note | Direct `node apps/api/dist/server.js` from the repo root is still not the standardized env-loading path for this workspace; use `pnpm dev:api`, `pnpm dev`, or the E2E stack for validation until built-output startup is normalized. |

## 6. Documentation

| Document | Status | Notes |
| --- | --- | --- |
| `docs/PHASED_DELIVERY_PLAN.md` | `[x]` | Full phase plan covering phases 0-7C and AI-L3A-D. |
| `docs/REAL_AI_SETUP.md` | `[x]` | Provider setup instructions for Gemini/OpenAI. |
| `docs/AI_LEVEL_3_RUNTIME_NOTES.md` | `[x]` | Internal `internal_l3_tutor` runtime, opt-in external fallback, metadata contract, and diagnostics fields. |
| `docs/LOW_LEVEL_4_LOCAL_LORA.md` | `[x]` | Updated 2026-05-17 with Phase 9 failure analysis, targeted v4 dataset, prompt-shape changes, stronger-suite benchmark results, and honest limits. |
| `docs/RUNTIME_RUNBOOK.md` | `[x]` | Updated 2026-05-17 with v4 runtime flags, smoke flow, health expectations, and current Local LoRA limits. |
| `docs/PROJECT_PROGRESS_CHECKLIST.md` | `[x]` | This file. Updated 2026-05-17 for the Phase 9 closeout state. |
